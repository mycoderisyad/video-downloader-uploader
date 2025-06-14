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
    const { url, title, quality = 'best', downloadMode = 'server', batchId } = req.body;
    
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
    startDownload(jobId, url, outputPath, quality, downloadMode, platform);

  } catch (error) {
    logger.error('Error in downloadVideo:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting download',
      error: error.message
    });
  }
};

const startDownload = async (jobId, url, outputPath, quality, downloadMode, platform) => {
  try {
    updateJobStatus(jobId, 'downloading', 0);
    
    if (downloadMode === 'direct') {
      // Direct download mode - stream directly to user
      await handleDirectDownload(jobId, url, quality);
    } else {
      // Server download mode - save to server first
      if (platform) {
        await downloadFromPlatform(jobId, url, outputPath, quality, platform);
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

const downloadFromPlatform = async (jobId, url, outputPath, quality, platform) => {
  // For now, we'll use yt-dlp for platform downloads
  // This requires yt-dlp to be installed on the system
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const args = [
      '--format', getYtDlpFormat(quality),
      '--output', outputPath.replace('.mp4', '.%(ext)s'),
      '--merge-output-format', 'mp4',
      '--progress-template', 'download:%(progress._percent_str)s %(progress._speed_str)s %(progress._eta_str)s',
      url
    ];
    
    const ytdlp = spawn('yt-dlp', args);
    
    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      parseYtDlpProgress(jobId, output);
    });
    
    ytdlp.stderr.on('data', (data) => {
      logger.warn(`yt-dlp stderr: ${data}`);
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        updateJobStatus(jobId, 'completed', 100);
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
    
    ytdlp.on('error', (error) => {
      reject(error);
    });
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

const handleDirectDownload = async (jobId, url, quality) => {
  try {
    const job = downloadJobs.get(jobId);
    if (!job) return;
    
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