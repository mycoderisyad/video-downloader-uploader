const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { downloadJobs } = require('./videoController');

// YouTube upload job storage
const uploadJobs = new Map();

// OAuth2 credentials - these should be set in .env file
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || `https://prafunschool.web.id/api/auth/youtube/callback`;

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// YouTube API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube'
];

const initiateAuth = (req, res) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'YouTube credentials not configured. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in environment variables.'
      });
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: req.query.state || 'default'
    });

    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL for YouTube authentication'
    });
  } catch (error) {
    logger.error('Error initiating YouTube auth:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating YouTube authentication'
    });
  }
};

const handleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Authentication error: ${error}`
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code not received'
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens securely (in production, use encrypted storage)
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      created_at: new Date()
    };

    // Save tokens to file (in production, use secure database)
    await fs.writeJson(path.join(__dirname, '../config/youtube_tokens.json'), tokenData);

    // Redirect to success page
    res.redirect('/?auth=success');
  } catch (error) {
    logger.error('Error handling YouTube callback:', error);
    res.redirect('/?auth=error');
  }
};

const uploadToYoutube = async (req, res) => {
  try {
    const {
      jobId,
      title,
      description = '',
      tags = [],
      category = '22', // People & Blogs
      privacy = 'private'
    } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID diperlukan'
      });
    }

    // Check if download job exists and is completed
    const downloadJob = downloadJobs.get(jobId);
    if (!downloadJob) {
      return res.status(404).json({
        success: false,
        message: 'Download job tidak ditemukan'
      });
    }

    if (downloadJob.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Download belum selesai'
      });
    }

    // Check if video file exists
    if (!await fs.pathExists(downloadJob.outputPath)) {
      return res.status(404).json({
        success: false,
        message: 'File video tidak ditemukan'
      });
    }

    // Load stored tokens
    const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
    if (!await fs.pathExists(tokenPath)) {
      return res.status(401).json({
        success: false,
        message: 'YouTube authentication required. Please authenticate first.',
        requireAuth: true
      });
    }

    const tokens = await fs.readJson(tokenPath);
    oauth2Client.setCredentials(tokens);

    // Create upload job
    const uploadJobId = uuidv4();
    uploadJobs.set(uploadJobId, {
      status: 'starting',
      progress: 0,
      downloadJobId: jobId,
      title: title || downloadJob.title,
      description,
      tags,
      category,
      privacy,
      startTime: new Date(),
      error: null,
      videoId: null
    });

    // Send immediate response
    res.json({
      success: true,
      uploadJobId,
      message: 'YouTube upload started',
      status: 'starting'
    });

    // Start upload process asynchronously
    startYouTubeUpload(uploadJobId, downloadJob.outputPath, {
      title: title || downloadJob.title,
      description,
      tags,
      category,
      privacy
    });

  } catch (error) {
    logger.error('Error in uploadToYoutube:', error);
    res.status(500).json({
      success: false,
      message: 'Error memulai upload ke YouTube',
      error: error.message
    });
  }
};

const startYouTubeUpload = async (uploadJobId, videoPath, metadata) => {
  try {
    updateUploadStatus(uploadJobId, 'uploading', 0);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const fileSize = (await fs.stat(videoPath)).size;
    let uploadedBytes = 0;

    const uploadParams = {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: metadata.category,
          defaultLanguage: 'id',
          defaultAudioLanguage: 'id'
        },
        status: {
          privacyStatus: metadata.privacy,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    };

    // Track upload progress
    const progressInterval = setInterval(() => {
      if (uploadedBytes > 0) {
        const progress = (uploadedBytes / fileSize) * 100;
        updateUploadStatus(uploadJobId, 'uploading', progress);
      }
    }, 1000);

    const response = await youtube.videos.insert(uploadParams);

    clearInterval(progressInterval);

    if (response.data && response.data.id) {
      updateUploadStatus(uploadJobId, 'completed', 100, null, response.data.id);
      logger.info(`YouTube upload completed for job ${uploadJobId}, video ID: ${response.data.id}`);
    } else {
      throw new Error('Upload completed but no video ID returned');
    }

  } catch (error) {
    logger.error(`YouTube upload error for job ${uploadJobId}:`, error);
    
    let errorMessage = error.message;
    if (error.code === 401) {
      errorMessage = 'Authentication expired. Please re-authenticate with YouTube.';
    } else if (error.code === 403) {
      errorMessage = 'YouTube API quota exceeded or insufficient permissions.';
    }
    
    updateUploadStatus(uploadJobId, 'error', 0, errorMessage);
  }
};

const getUploadStatus = (req, res) => {
  try {
    const { jobId } = req.params;
    const job = uploadJobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Upload job tidak ditemukan'
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
        videoId: job.videoId,
        videoUrl: job.videoId ? `https://www.youtube.com/watch?v=${job.videoId}` : null
      }
    });
  } catch (error) {
    logger.error('Error getting upload status:', error);
    res.status(500).json({
      success: false,
      message: 'Error mendapatkan status upload'
    });
  }
};

// Helper functions
const updateUploadStatus = (jobId, status, progress, error = null, videoId = null) => {
  const job = uploadJobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = Math.round(progress);
    job.error = error;
    job.videoId = videoId;
    job.lastUpdate = new Date();
    uploadJobs.set(jobId, job);
  }
};

// Check and refresh tokens if needed
const ensureValidTokens = async () => {
  try {
    const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
    if (!await fs.pathExists(tokenPath)) {
      return false;
    }

    const tokens = await fs.readJson(tokenPath);
    oauth2Client.setCredentials(tokens);

    // Check if token needs refresh
    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      if (tokens.refresh_token) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        
        // Save refreshed tokens
        await fs.writeJson(tokenPath, {
          ...tokens,
          ...credentials,
          updated_at: new Date()
        });
        
        logger.info('YouTube tokens refreshed successfully');
        return true;
      } else {
        logger.warn('YouTube tokens expired and no refresh token available');
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error ensuring valid YouTube tokens:', error);
    return false;
  }
};

// Cleanup old upload jobs (run every hour)
setInterval(() => {
  const now = new Date();
  for (const [jobId, job] of uploadJobs.entries()) {
    const timeDiff = now - job.startTime;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) { // Clean up jobs older than 24 hours
      uploadJobs.delete(jobId);
      logger.info(`Cleaned up old upload job: ${jobId}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
  initiateAuth,
  handleCallback,
  uploadToYoutube,
  getUploadStatus,
  ensureValidTokens,
  uploadJobs
}; 