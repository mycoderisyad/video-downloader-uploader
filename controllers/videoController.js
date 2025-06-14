const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sanitize = require('sanitize-filename');
const axios = require('axios');
const logger = require('../utils/logger');

// Job storage for tracking download progress
const downloadJobs = new Map();
const batchJobs = new Map();

// Set FFmpeg path (adjust based on your system)
// For Ubuntu/Debian: ffmpeg is usually in /usr/bin/ffmpeg
try {
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
} catch (error) {
  logger.warn('FFmpeg path not set, using system default');
}

// Platform-specific URL patterns
const platformPatterns = {
  youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  vimeo: /vimeo\.com\/(\d+)/,
  facebook: /facebook\.com.*\/videos\/(\d+)/,
  instagram: /instagram\.com\/p\/([a-zA-Z0-9_-]+)/
};

const downloadVideo = async (req, res) => {
  try {
    const { url, title, quality = 'best', downloadMode = 'server', downloaderChoice = 'auto', batchId } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Video URL is required'
      });
    }

    // Validate URL and detect platform
    const platform = detectPlatform(url);
    if (!platform && !isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported URL'
      });
    }

    const jobId = uuidv4();
    const sanitizedTitle = sanitize(title || `video_${Date.now()}`);
    const outputPath = path.join(__dirname, '../downloads', `${sanitizedTitle}_${jobId}.mp4`);
    
    // Initialize job tracking
    downloadJobs.set(jobId, {
      status: 'starting',
      progress: 0,
      url,
      title: sanitizedTitle,
      quality,
      downloadMode,
      platform,
      outputPath,
      startTime: new Date(),
      error: null,
      speed: 0,
      eta: null,
      fileSize: null,
      batchId
    });

    // Send immediate response with job ID
    res.json({
      success: true,
      jobId,
      message: 'Download started',
      status: 'starting'
    });

    // Start download process asynchronously
    startDownload(jobId, url, outputPath, quality, downloadMode, platform, downloaderChoice);

  } catch (error) {
    logger.error('Error in downloadVideo:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting download',
      error: error.message
    });
  }
};

const startDownload = async (jobId, url, outputPath, quality, downloadMode, platform, downloaderChoice = 'auto') => {
  try {
    updateJobStatus(jobId, 'downloading', 0);
    
    if (downloadMode === 'direct') {
      // Direct download mode - stream directly to user
      await handleDirectDownload(jobId, url, quality, downloaderChoice);
    } else {
      // Server download mode - save to server first
      if (platform) {
        await downloadFromPlatform(jobId, url, outputPath, quality, platform, downloaderChoice);
      } else {
        // Check if URL is m3u8 or other streaming format
        const isM3u8 = url.includes('.m3u8') || url.includes('m3u8');
        
        if (isM3u8) {
          await downloadM3u8(jobId, url, outputPath, quality);
        } else {
          await downloadDirectVideo(jobId, url, outputPath, quality);
        }
      }
    }
    
  } catch (error) {
    logger.error(`Download error for job ${jobId}:`, error);
    updateJobStatus(jobId, 'error', 0, error.message);
  }
};

const downloadFromPlatform = async (jobId, url, outputPath, quality, platform, downloaderChoice = 'auto') => {
  const { spawn } = require('child_process');
  
  // Choose downloader based on user selection or auto-detect
  let downloader;
  if (downloaderChoice === 'auto') {
    downloader = getDownloaderForPlatform(platform);
  } else {
    downloader = downloaderChoice;
  }
  
  logger.info(`Using downloader: ${downloader} for platform: ${platform}`);
  
  try {
    switch (downloader) {
      case 'youtube-dl-exec':
        return await downloadWithYoutubeDlExec(jobId, url, outputPath, quality, platform);
      case 'gallery-dl':
        return await downloadWithGalleryDl(jobId, url, outputPath, quality);
      case 'you-get':
        return await downloadWithYouGet(jobId, url, outputPath, quality);
      case 'youtube-dl':
        return await downloadWithYoutubeDl(jobId, url, outputPath, quality);
      case 'yt-dlp':
      default:
        return await downloadWithYtDlp(jobId, url, outputPath, quality, platform);
    }
  } catch (error) {
    // If selected downloader fails, try fallback for social media platforms
    if (downloaderChoice !== 'auto' && (platform === 'instagram' || platform === 'facebook')) {
      logger.warn(`${downloader} failed, trying fallback for ${platform}`);
      try {
        const fallbackDownloader = downloader === 'gallery-dl' ? 'yt-dlp' : 'gallery-dl';
        logger.info(`Trying fallback downloader: ${fallbackDownloader}`);
        
        if (fallbackDownloader === 'gallery-dl') {
          return await downloadWithGalleryDl(jobId, url, outputPath, quality);
        } else {
          return await downloadWithYtDlp(jobId, url, outputPath, quality, platform);
        }
      } catch (fallbackError) {
        logger.error(`Fallback downloader also failed: ${fallbackError.message}`);
        throw error; // Throw original error
      }
    } else {
      throw error;
    }
  }
};

const getDownloaderForPlatform = (platform) => {
  switch (platform) {
    case 'instagram':
    case 'facebook':
      return 'gallery-dl'; // Better for social media
    case 'youtube':
    case 'vimeo':
    default:
      return 'yt-dlp'; // Keep yt-dlp for YouTube and others
  }
};

const downloadWithGalleryDl = async (jobId, url, outputPath, quality) => {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const args = [
      '--write-info-json',
      '--no-skip',
      '--output', outputPath.replace('.mp4', '.%(ext)s'),
      url
    ];
    
    logger.info(`Starting gallery-dl with args: ${args.join(' ')}`);
    const galleryDl = spawn('gallery-dl', args);
    
    let hasOutput = false;
    let errorOutput = '';
    
    galleryDl.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      logger.info(`gallery-dl stdout: ${output}`);
      
      // Parse progress if available
      if (output.includes('%')) {
        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          updateJobStatus(jobId, 'downloading', progress);
        }
      }
    });
    
    galleryDl.stderr.on('data', (data) => {
      const stderr = data.toString();
      errorOutput += stderr;
      logger.warn(`gallery-dl stderr: ${stderr}`);
      
      // Check for specific errors
      if (stderr.includes('HTTP Error 404')) {
        updateJobStatus(jobId, 'error', 0, 'Video tidak ditemukan atau telah dihapus');
      } else if (stderr.includes('Private')) {
        updateJobStatus(jobId, 'error', 0, 'Video bersifat private');
      } else if (stderr.includes('Login required')) {
        updateJobStatus(jobId, 'error', 0, 'Video memerlukan login');
      }
    });
    
    galleryDl.on('close', (code) => {
      logger.info(`gallery-dl process closed with code: ${code}`);
      
      if (code === 0) {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      } else {
        let errorMessage = 'Download gagal dengan gallery-dl';
        
        if (errorOutput.includes('404')) {
          errorMessage = 'Video tidak ditemukan atau telah dihapus';
        } else if (errorOutput.includes('Private')) {
          errorMessage = 'Video bersifat private dan tidak dapat didownload';
        } else if (errorOutput.includes('Login')) {
          errorMessage = 'Video memerlukan login untuk diakses';
        } else {
          errorMessage = 'Download gagal. Coba lagi atau periksa URL.';
        }
        
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    galleryDl.on('error', (error) => {
      logger.error(`gallery-dl spawn error: ${error.message}`);
      const errorMessage = 'gallery-dl tidak dapat dijalankan. Pastikan gallery-dl sudah terinstall.';
      updateJobStatus(jobId, 'error', 0, errorMessage);
      reject(new Error(errorMessage));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (!hasOutput) {
        galleryDl.kill();
        const errorMessage = 'Download timeout dengan gallery-dl.';
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    }, 300000);
  });
};

const downloadWithYouGet = async (jobId, url, outputPath, quality) => {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const args = [
      '--output-dir', path.dirname(outputPath),
      '--output-filename', path.basename(outputPath, '.mp4'),
      '--format', 'mp4',
      url
    ];
    
    logger.info(`Starting you-get with args: ${args.join(' ')}`);
    const youget = spawn('you-get', args);
    
    let hasOutput = false;
    let errorOutput = '';
    
    youget.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      logger.info(`you-get stdout: ${output}`);
      
      // Parse progress if available
      if (output.includes('%')) {
        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          updateJobStatus(jobId, 'downloading', progress);
        }
      }
    });
    
    youget.stderr.on('data', (data) => {
      const stderr = data.toString();
      errorOutput += stderr;
      logger.warn(`you-get stderr: ${stderr}`);
    });
    
    youget.on('close', (code) => {
      logger.info(`you-get process closed with code: ${code}`);
      
      if (code === 0) {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      } else {
        const errorMessage = `you-get failed with code ${code}`;
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    youget.on('error', (error) => {
      logger.error(`you-get spawn error: ${error.message}`);
      const errorMessage = 'you-get tidak dapat dijalankan. Pastikan you-get sudah terinstall.';
      updateJobStatus(jobId, 'error', 0, errorMessage);
      reject(new Error(errorMessage));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (!hasOutput) {
        youget.kill();
        const errorMessage = 'you-get timeout.';
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    }, 300000);
  });
};

const downloadWithYoutubeDl = async (jobId, url, outputPath, quality) => {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--format', getYtDlpFormat(quality),
      '--output', outputPath.replace('.mp4', '.%(ext)s'),
      '--merge-output-format', 'mp4',
      url
    ];
    
    logger.info(`Starting youtube-dl fallback with args: ${args.join(' ')}`);
    const youtubeDl = spawn('youtube-dl', args);
    
    let hasOutput = false;
    let errorOutput = '';
    
    youtubeDl.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      logger.info(`youtube-dl stdout: ${output}`);
      
      // Parse progress if available
      if (output.includes('%')) {
        const progressMatch = output.match(/(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          updateJobStatus(jobId, 'downloading', progress);
        }
      }
    });
    
    youtubeDl.stderr.on('data', (data) => {
      const stderr = data.toString();
      errorOutput += stderr;
      logger.warn(`youtube-dl stderr: ${stderr}`);
    });
    
    youtubeDl.on('close', (code) => {
      logger.info(`youtube-dl process closed with code: ${code}`);
      
      if (code === 0) {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      } else {
        const errorMessage = `youtube-dl fallback failed with code ${code}`;
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    youtubeDl.on('error', (error) => {
      logger.error(`youtube-dl spawn error: ${error.message}`);
      const errorMessage = 'youtube-dl tidak dapat dijalankan. Pastikan youtube-dl sudah terinstall.';
      updateJobStatus(jobId, 'error', 0, errorMessage);
      reject(new Error(errorMessage));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (!hasOutput) {
        youtubeDl.kill();
        const errorMessage = 'youtube-dl timeout.';
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    }, 300000);
  });
};

const downloadWithYoutubeDlExec = async (jobId, url, outputPath, quality, platform) => {
  const youtubedl = require('youtube-dl-exec');
  
  try {
    const flags = {
      noWarnings: true,
      noCheckCertificates: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      referer: url,
      extractorRetries: 3,
      fragmentRetries: 3,
      retrySleep: 1,
      format: getYtDlpFormat(quality),
      output: outputPath.replace('.mp4', '.%(ext)s'),
      mergeOutputFormat: 'mp4'
    };

    // For YouTube, add additional anti-bot measures
    if (platform === 'youtube') {
      flags.sleepInterval = 1;
      flags.maxSleepInterval = 3;
      flags.cookiesFromBrowser = 'chrome';
      flags.extractorArgs = 'youtube:player_client=android';
    }

    logger.info(`Starting youtube-dl-exec with flags: ${JSON.stringify(flags)}`);
    
    // Use youtube-dl-exec with progress tracking
    const result = await youtubedl(url, flags);
    
    updateJobStatus(jobId, 'completed', 100);
    logger.info(`youtube-dl-exec completed successfully for job ${jobId}`);
    
  } catch (error) {
    logger.error(`youtube-dl-exec error for job ${jobId}:`, error);
    
    let errorMessage = 'Download gagal dengan youtube-dl-exec';
    if (error.message.includes('Sign in to confirm you\'re not a bot')) {
      errorMessage = 'YouTube mendeteksi aktivitas bot. Coba downloader lain atau gunakan Server Download.';
    } else if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video tidak tersedia atau telah dihapus';
    }
    
    updateJobStatus(jobId, 'error', 0, errorMessage);
    throw new Error(errorMessage);
  }
};

const downloadWithYtDlp = async (jobId, url, outputPath, quality, platform) => {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--referer', url,
      '--extractor-retries', '3',
      '--fragment-retries', '3',
      '--retry-sleep', '1',
      '--format', getYtDlpFormat(quality),
      '--output', outputPath.replace('.mp4', '.%(ext)s'),
      '--merge-output-format', 'mp4',
      '--progress-template', 'download:%(progress._percent_str)s %(progress._speed_str)s %(progress._eta_str)s',
      url
    ];
    
    // For YouTube, add additional anti-bot measures
    if (platform === 'youtube') {
      args.push('--sleep-interval', '1');
      args.push('--max-sleep-interval', '3');
      // Try to use cookies from browser to avoid bot detection
      args.push('--cookies-from-browser', 'chrome');
      // Add more anti-detection measures
      args.push('--extractor-args', 'youtube:player_client=android');
    }
    
    logger.info(`Starting yt-dlp with args: ${args.join(' ')}`);
    const ytdlp = spawn('yt-dlp', args);
    
    let hasOutput = false;
    let errorOutput = '';
    
    ytdlp.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      logger.info(`yt-dlp stdout: ${output}`);
      parseYtDlpProgress(jobId, output);
    });
    
    ytdlp.stderr.on('data', (data) => {
      const stderr = data.toString();
      errorOutput += stderr;
      logger.warn(`yt-dlp stderr: ${stderr}`);
      
      // Check for specific errors
      if (stderr.includes('Video unavailable') || stderr.includes('Private video')) {
        updateJobStatus(jobId, 'error', 0, 'Video tidak tersedia atau private');
      } else if (stderr.includes('Sign in to confirm your age')) {
        updateJobStatus(jobId, 'error', 0, 'Video memerlukan verifikasi umur');
      } else if (stderr.includes('Sign in to confirm you\'re not a bot') || stderr.includes('bot')) {
        updateJobStatus(jobId, 'error', 0, 'YouTube mendeteksi aktivitas bot. Gunakan mode "Server Download" untuk hasil yang lebih baik.');
      } else if (stderr.includes('This video is not available')) {
        updateJobStatus(jobId, 'error', 0, 'Video tidak tersedia di region ini');
      } else if (stderr.includes('Requested format is not available')) {
        updateJobStatus(jobId, 'error', 0, 'Format video yang diminta tidak tersedia');
      } else if (stderr.includes('HTTP Error 429') || stderr.includes('Too Many Requests')) {
        updateJobStatus(jobId, 'error', 0, 'Terlalu banyak request. Coba lagi dalam beberapa menit.');
      }
    });
    
    ytdlp.on('close', async (code) => {
      logger.info(`yt-dlp process closed with code: ${code}`);
      
      if (code === 0) {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      } else {
        let errorMessage = `yt-dlp exited with code ${code}`;
        
        // Provide more specific error messages based on error output
        if (errorOutput.includes('Video unavailable')) {
          errorMessage = 'Video tidak tersedia atau telah dihapus';
        } else if (errorOutput.includes('Private video')) {
          errorMessage = 'Video bersifat private dan tidak dapat didownload';
        } else if (errorOutput.includes('Sign in to confirm you\'re not a bot') || errorOutput.includes('bot')) {
          // Try youtube-dl as fallback for YouTube
          if (platform === 'youtube') {
            logger.info(`yt-dlp failed with bot detection, trying youtube-dl fallback for job ${jobId}`);
            try {
              await downloadWithYoutubeDl(jobId, url, outputPath, quality);
              resolve(); // Success with fallback
              return;
            } catch (fallbackError) {
              logger.error(`youtube-dl fallback also failed: ${fallbackError.message}`);
              errorMessage = 'YouTube mendeteksi aktivitas bot. Kedua downloader gagal. Gunakan mode "Server Download" untuk hasil yang lebih baik.';
            }
          } else {
            errorMessage = 'YouTube mendeteksi aktivitas bot. Gunakan mode "Server Download" untuk hasil yang lebih baik.';
          }
        } else if (errorOutput.includes('Sign in to confirm')) {
          errorMessage = 'Video memerlukan login atau verifikasi umur';
        } else if (errorOutput.includes('HTTP Error 429') || errorOutput.includes('Too Many Requests')) {
          errorMessage = 'Terlalu banyak request ke YouTube. Coba lagi dalam beberapa menit.';
        } else if (errorOutput.includes('not available')) {
          errorMessage = 'Video tidak tersedia di region ini atau telah dibatasi';
        } else if (errorOutput.includes('Requested format')) {
          errorMessage = 'Format video yang diminta tidak tersedia, coba quality lain';
        } else {
          // Provide more specific error messages based on exit code
          switch (code) {
            case 1:
              if (platform === 'youtube') {
                errorMessage = 'YouTube download gagal karena bot detection. Gunakan mode "Server Download" untuk hasil yang lebih baik.';
              } else {
                errorMessage = 'Video tidak dapat didownload. Mungkin private, tidak tersedia, atau memerlukan login.';
              }
              break;
            case 2:
              errorMessage = 'URL tidak valid atau tidak didukung.';
              break;
            case 101:
              errorMessage = 'Video tidak tersedia di region ini.';
              break;
            default:
              errorMessage = `Download gagal dengan kode error ${code}. Coba lagi atau gunakan URL yang berbeda.`;
          }
        }
        
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    });
    
    ytdlp.on('error', (error) => {
      logger.error(`yt-dlp spawn error: ${error.message}`);
      const errorMessage = 'yt-dlp tidak dapat dijalankan. Pastikan yt-dlp sudah terinstall dengan: pip3 install yt-dlp';
      updateJobStatus(jobId, 'error', 0, errorMessage);
      reject(new Error(errorMessage));
    });
    
    // Timeout after 5 minutes if no output
    setTimeout(() => {
      if (!hasOutput) {
        ytdlp.kill();
        const errorMessage = 'Download timeout. URL mungkin tidak valid atau server tidak merespons.';
        updateJobStatus(jobId, 'error', 0, errorMessage);
        reject(new Error(errorMessage));
      }
    }, 300000); // 5 minutes
  });
};

const downloadM3u8 = (jobId, url, outputPath, quality) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(url)
      .outputOptions([
        '-c copy',
        '-bsf:a aac_adtstoasc',
        '-f mp4'
      ])
      .output(outputPath);

    // Add quality settings
    if (quality !== 'best') {
      command = command.outputOptions([
        `-vf scale=${getScaleForQuality(quality)}`,
        '-c:v libx264',
        '-preset fast',
        '-crf 23'
      ]);
    }

    let startTime = Date.now();
    let lastProgress = 0;

    command
      .on('start', (commandLine) => {
        logger.info(`FFmpeg started for job ${jobId}: ${commandLine}`);
        updateJobStatus(jobId, 'downloading', 5);
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.max(progress.percent || 0, 0), 100);
        const currentTime = Date.now();
        const elapsed = (currentTime - startTime) / 1000;
        
        // Calculate speed and ETA
        const progressDiff = percent - lastProgress;
        const speed = progressDiff / elapsed * 1000; // percent per second
        const eta = speed > 0 ? (100 - percent) / speed : null;
        
        updateJobStatus(jobId, 'downloading', percent, null, {
          speed: progress.currentKbps ? progress.currentKbps * 1024 : null,
          eta: eta,
          fileSize: progress.targetSize ? progress.targetSize * 1024 : null
        });
        
        lastProgress = percent;
        startTime = currentTime;
        
        logger.info(`Download progress for job ${jobId}: ${percent.toFixed(2)}%`);
      })
      .on('end', () => {
        logger.info(`Download completed for job ${jobId}`);
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      })
      .on('error', (error) => {
        logger.error(`FFmpeg error for job ${jobId}:`, error);
        updateJobStatus(jobId, 'error', 0, error.message);
        reject(error);
      })
      .run();
  });
};

const handleDirectDownload = async (jobId, url, quality, downloaderChoice = 'auto') => {
  try {
    const job = downloadJobs.get(jobId);
    if (!job) return;
    
    const platform = detectPlatform(url);
    
    // For YouTube direct download, show error message about bot detection
    if (platform === 'youtube') {
      updateJobStatus(jobId, 'error', 0, 'Direct download dari YouTube tidak tersedia karena bot detection. Gunakan mode "Server Download" terlebih dahulu, lalu download file dari history.');
      return;
    }
    
    // For direct download, we still need to process the video first
    // Then provide the processed file for direct download
    const sanitizedTitle = sanitize(job.title || `video_${Date.now()}`);
    const outputPath = path.join(__dirname, '../downloads', `${sanitizedTitle}_${jobId}.mp4`);
    
    // Update job status to processing
    updateJobStatus(jobId, 'downloading', 0);
    
    // Check if URL is m3u8 or other streaming format
    const isM3u8 = url.includes('.m3u8') || url.includes('m3u8');
    
    if (isM3u8) {
      // Process M3U8 to MP4 first
      await downloadM3u8(jobId, url, outputPath, quality);
    } else if (platform && platform !== 'youtube') {
      // Use selected downloader for platform videos (except YouTube)
      await downloadFromPlatform(jobId, url, outputPath, quality, platform, downloaderChoice);
    } else {
      // Process direct video
      await downloadDirectVideo(jobId, url, outputPath, quality);
    }
    
    // After processing, mark as direct download ready
    job.outputPath = outputPath;
    job.isDirectDownload = true;
    job.directDownloadReady = true;
    downloadJobs.set(jobId, job);
    
    logger.info(`Direct download processed and ready for job ${jobId}`);
  } catch (error) {
    logger.error(`Direct download error for job ${jobId}:`, error);
    updateJobStatus(jobId, 'error', 0, error.message);
  }
};

const downloadDirectVideo = async (jobId, url, outputPath, quality) => {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloadedLength = 0;
    let startTime = Date.now();
    let lastTime = startTime;
    let lastDownloaded = 0;

    const writer = fs.createWriteStream(outputPath);

    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      const currentTime = Date.now();
      
      if (totalLength) {
        const percent = (downloadedLength / totalLength) * 100;
        
        // Calculate speed (bytes per second)
        const timeDiff = (currentTime - lastTime) / 1000;
        const bytesDiff = downloadedLength - lastDownloaded;
        const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
        
        // Calculate ETA
        const remainingBytes = totalLength - downloadedLength;
        const eta = speed > 0 ? remainingBytes / speed : null;
        
        updateJobStatus(jobId, 'downloading', percent, null, {
          speed: speed,
          eta: eta,
          fileSize: totalLength
        });
        
        lastTime = currentTime;
        lastDownloaded = downloadedLength;
      }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      });
      
      writer.on('error', (error) => {
        updateJobStatus(jobId, 'error', 0, error.message);
        reject(error);
      });
    });

  } catch (error) {
    throw error;
  }
};

const previewVideo = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    const platform = detectPlatform(url);
    
    if (platform) {
      // Use yt-dlp to get video info
      const { spawn } = require('child_process');
      const args = ['--dump-json', '--no-download', url];
      
      const ytdlp = spawn('yt-dlp', args);
      let output = '';
      
      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            res.json({
              success: true,
              title: info.title,
              duration: formatDuration(info.duration),
              quality: info.height ? `${info.height}p` : 'Unknown',
              size: info.filesize ? formatBytes(info.filesize) : 'Unknown',
              format: info.ext || 'Unknown',
              thumbnail: info.thumbnail,
              previewUrl: info.url // This might not work for all platforms due to CORS
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              message: 'Error parsing video info'
            });
          }
        } else {
          res.status(500).json({
            success: false,
            message: 'Error getting video info'
          });
        }
      });
    } else {
      // For direct URLs, try to get basic info
      try {
        const response = await axios.head(url);
        const contentLength = response.headers['content-length'];
        const contentType = response.headers['content-type'];
        
        res.json({
          success: true,
          title: path.basename(url),
          duration: 'Unknown',
          quality: 'Unknown',
          size: contentLength ? formatBytes(parseInt(contentLength)) : 'Unknown',
          format: contentType ? contentType.split('/')[1] : 'Unknown',
          previewUrl: url
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Error accessing video URL'
        });
      }
    }
  } catch (error) {
    logger.error('Error in previewVideo:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Job not completed yet'
      });
    }
    
    // For both direct and server download, serve the processed file
    const filePath = job.outputPath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const filename = `${job.title || 'video'}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logger.info(`File download started for job ${jobId}: ${filename}`);
    
  } catch (error) {
    logger.error('Error in downloadFile:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};

const getDownloadStatus = (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      job: {
        id: jobId,
        status: job.status,
        progress: job.progress,
        error: job.error,
        speed: job.speed,
        eta: job.eta,
        fileSize: job.fileSize,
        platform: job.platform,
        downloadMode: job.downloadMode,
        directDownloadUrl: job.directDownloadUrl,
        isDirectDownload: job.isDirectDownload
      }
    });
  } catch (error) {
    logger.error('Error in getDownloadStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting download status',
      error: error.message
    });
  }
};

const cleanupFiles = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Delete the downloaded file
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      await fs.unlink(job.outputPath);
      logger.info(`Cleaned up file: ${job.outputPath}`);
    }

    // Remove job from memory
    downloadJobs.delete(jobId);

    res.json({
      success: true,
      message: 'Files cleaned up successfully'
    });
  } catch (error) {
    logger.error('Error in cleanupFiles:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up files',
      error: error.message
    });
  }
};

const clearAllFiles = async (req, res) => {
  try {
    let deletedCount = 0;
    let errorCount = 0;
    
    // Delete all files from download jobs
    for (const [jobId, job] of downloadJobs.entries()) {
      try {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          await fs.unlink(job.outputPath);
          deletedCount++;
          logger.info(`Deleted file: ${job.outputPath}`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Error deleting file for job ${jobId}:`, error);
      }
    }
    
    // Clear all jobs from memory
    downloadJobs.clear();
    
    // Also clean up any orphaned files in downloads directory
    try {
      const downloadsDir = path.join(__dirname, '../downloads');
      const files = await fs.readdir(downloadsDir);
      
      for (const file of files) {
        if (file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.webm')) {
          const filePath = path.join(downloadsDir, file);
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted orphaned file: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning orphaned files:', error);
    }
    
    res.json({
      success: true,
      message: `Successfully cleared all files. Deleted: ${deletedCount}, Errors: ${errorCount}`,
      deletedCount,
      errorCount
    });
  } catch (error) {
    logger.error('Error in clearAllFiles:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing all files',
      error: error.message
    });
  }
};

// Auto cleanup function - runs every 24 hours
const autoCleanup = async () => {
  try {
    const now = new Date();
    let cleanedJobs = 0;
    let cleanedFiles = 0;
    
    // Clean up jobs older than 24 hours
    for (const [jobId, job] of downloadJobs.entries()) {
      const jobAge = now - new Date(job.startTime);
      const hoursOld = jobAge / (1000 * 60 * 60);
      
      if (hoursOld > 24) {
        // Delete file if exists
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          try {
            await fs.unlink(job.outputPath);
            cleanedFiles++;
            logger.info(`Auto-cleanup: Deleted old file: ${job.outputPath}`);
          } catch (error) {
            logger.error(`Auto-cleanup: Error deleting file ${job.outputPath}:`, error);
          }
        }
        
        // Remove job from memory
        downloadJobs.delete(jobId);
        cleanedJobs++;
      }
    }
    
    // Clean up orphaned files in downloads directory
    try {
      const downloadsDir = path.join(__dirname, '../downloads');
      const files = await fs.readdir(downloadsDir);
      
      for (const file of files) {
        const filePath = path.join(downloadsDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtime;
        const hoursOld = fileAge / (1000 * 60 * 60);
        
        if (hoursOld > 24 && (file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.webm'))) {
          await fs.unlink(filePath);
          cleanedFiles++;
          logger.info(`Auto-cleanup: Deleted old orphaned file: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error('Auto-cleanup: Error cleaning orphaned files:', error);
    }
    
    if (cleanedJobs > 0 || cleanedFiles > 0) {
      logger.info(`Auto-cleanup completed: ${cleanedJobs} jobs, ${cleanedFiles} files cleaned`);
    }
  } catch (error) {
    logger.error('Auto-cleanup error:', error);
  }
};

// Start auto cleanup interval (every 24 hours)
setInterval(autoCleanup, 24 * 60 * 60 * 1000);

// Run initial cleanup after 1 minute
setTimeout(autoCleanup, 60 * 1000);

// Helper functions
const updateJobStatus = (jobId, status, progress, error = null, stats = {}) => {
  const job = downloadJobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = progress;
    job.error = error;
    job.speed = stats.speed || job.speed;
    job.eta = stats.eta || job.eta;
    job.fileSize = stats.fileSize || job.fileSize;
    job.lastUpdate = new Date();
  }
};

const detectPlatform = (url) => {
  for (const [platform, pattern] of Object.entries(platformPatterns)) {
    if (pattern.test(url)) {
      return platform;
    }
  }
  return null;
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const getScaleForQuality = (quality) => {
  switch (quality) {
    case '1080p':
      return '1920:1080';
    case '720p':
      return '1280:720';
    case '480p':
      return '854:480';
    case '360p':
      return '640:360';
    default:
      return '-1:-1'; // Keep original
  }
};

const getYtDlpFormat = (quality) => {
  switch (quality) {
    case '1080p':
      return 'best[height<=1080]';
    case '720p':
      return 'best[height<=720]';
    case '480p':
      return 'best[height<=480]';
    case '360p':
      return 'best[height<=360]';
    default:
      return 'best';
  }
};

const parseYtDlpProgress = (jobId, output) => {
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('%')) {
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      const speedMatch = line.match(/(\d+\.?\d*[KMG]?iB\/s)/);
      const etaMatch = line.match(/ETA (\d+:\d+)/);
      
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        const speed = speedMatch ? parseSpeedString(speedMatch[1]) : null;
        const eta = etaMatch ? parseTimeString(etaMatch[1]) : null;
        
        updateJobStatus(jobId, 'downloading', percent, null, {
          speed: speed,
          eta: eta
        });
      }
    }
  }
};

const parseSpeedString = (speedStr) => {
  const match = speedStr.match(/(\d+\.?\d*)([KMG]?)iB\/s/);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'K':
        return value * 1024;
      case 'M':
        return value * 1024 * 1024;
      case 'G':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }
  return null;
};

const parseTimeString = (timeStr) => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return null;
};

const formatDuration = (seconds) => {
  if (!seconds) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  downloadVideo,
  getDownloadStatus,
  cleanupFiles,
  clearAllFiles,
  previewVideo,
  downloadFile,
  downloadJobs
}; 