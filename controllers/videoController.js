const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sanitize = require('sanitize-filename');
const axios = require('axios');
const logger = require('../utils/logger');

// Job storage for tracking download progress
const downloadJobs = new Map();

// Set FFmpeg path (adjust based on your system)
// For Ubuntu/Debian: ffmpeg is usually in /usr/bin/ffmpeg
try {
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
} catch (error) {
  logger.warn('FFmpeg path not set, using system default');
}

const downloadVideo = async (req, res) => {
  try {
    const { url, title, quality = 'best' } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL video diperlukan'
      });
    }

    // Validate URL
    if (!isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'URL tidak valid'
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
      outputPath,
      startTime: new Date(),
      error: null
    });

    // Send immediate response with job ID
    res.json({
      success: true,
      jobId,
      message: 'Download started',
      status: 'starting'
    });

    // Start download process asynchronously
    startDownload(jobId, url, outputPath, quality);

  } catch (error) {
    logger.error('Error in downloadVideo:', error);
    res.status(500).json({
      success: false,
      message: 'Error memulai download',
      error: error.message
    });
  }
};

const startDownload = async (jobId, url, outputPath, quality) => {
  try {
    updateJobStatus(jobId, 'downloading', 0);
    
    // Check if URL is m3u8 or other streaming format
    const isM3u8 = url.includes('.m3u8') || url.includes('m3u8');
    
    if (isM3u8) {
      await downloadM3u8(jobId, url, outputPath, quality);
    } else {
      await downloadDirectVideo(jobId, url, outputPath, quality);
    }
    
  } catch (error) {
    logger.error(`Download error for job ${jobId}:`, error);
    updateJobStatus(jobId, 'error', 0, error.message);
  }
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

    command
      .on('start', (commandLine) => {
        logger.info(`FFmpeg started for job ${jobId}: ${commandLine}`);
        updateJobStatus(jobId, 'downloading', 5);
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.max(progress.percent || 0, 0), 100);
        updateJobStatus(jobId, 'downloading', percent);
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

    const writer = fs.createWriteStream(outputPath);

    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      if (totalLength) {
        const percent = (downloadedLength / totalLength) * 100;
        updateJobStatus(jobId, 'downloading', percent);
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

const getDownloadStatus = (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job tidak ditemukan'
      });
    }

    res.json({
      success: true,
      job: {
        id: jobId,
        status: job.status,
        progress: job.progress,
        title: job.title,
        error: job.error,
        startTime: job.startTime,
        outputPath: job.status === 'completed' ? job.outputPath : null
      }
    });
  } catch (error) {
    logger.error('Error getting download status:', error);
    res.status(500).json({
      success: false,
      message: 'Error mendapatkan status download'
    });
  }
};

const cleanupFiles = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (job && job.outputPath) {
      await fs.remove(job.outputPath);
      downloadJobs.delete(jobId);
      
      logger.info(`Cleaned up files for job ${jobId}`);
    }

    res.json({
      success: true,
      message: 'Files cleaned up successfully'
    });
  } catch (error) {
    logger.error('Error cleaning up files:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up files'
    });
  }
};

// Helper functions
const updateJobStatus = (jobId, status, progress, error = null) => {
  const job = downloadJobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = Math.round(progress);
    job.error = error;
    job.lastUpdate = new Date();
    downloadJobs.set(jobId, job);
  }
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
  const scales = {
    '480p': '854:480',
    '720p': '1280:720',
    '1080p': '1920:1080'
  };
  return scales[quality] || '1280:720';
};

// Cleanup old jobs (run every hour)
setInterval(() => {
  const now = new Date();
  for (const [jobId, job] of downloadJobs.entries()) {
    const timeDiff = now - job.startTime;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) { // Clean up jobs older than 24 hours
      try {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          fs.removeSync(job.outputPath);
        }
        downloadJobs.delete(jobId);
        logger.info(`Cleaned up old job: ${jobId}`);
      } catch (error) {
        logger.error(`Error cleaning up old job ${jobId}:`, error);
      }
    }
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
  downloadVideo,
  getDownloadStatus,
  cleanupFiles,
  downloadJobs
}; 