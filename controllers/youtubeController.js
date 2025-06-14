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

const initiateAuth = async (req, res) => {
  try {
    // Try to load saved credentials first
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    let clientId = CLIENT_ID;
    let clientSecret = CLIENT_SECRET;
    
    if (await fs.pathExists(credentialsPath)) {
      const savedCredentials = await fs.readJson(credentialsPath);
      clientId = savedCredentials.clientId;
      clientSecret = savedCredentials.clientSecret;
    }

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        message: 'YouTube credentials not configured. Please save your credentials in Settings first.',
        requireCredentials: true
      });
    }

    // Create OAuth2 client with current credentials
    const currentOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    );

    const authUrl = currentOAuth2Client.generateAuthUrl({
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
      message: 'Error initiating YouTube authentication: ' + error.message
    });
  }
};

const handleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('OAuth error:', error);
      return res.redirect('/?auth=error&message=' + encodeURIComponent(error));
    }

    if (!code) {
      logger.error('No authorization code received');
      return res.redirect('/?auth=error&message=' + encodeURIComponent('No authorization code received'));
    }

    // Load saved credentials
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    if (!await fs.pathExists(credentialsPath)) {
      logger.error('No saved credentials found');
      return res.redirect('/?auth=error&message=' + encodeURIComponent('No credentials found'));
    }

    const savedCredentials = await fs.readJson(credentialsPath);
    
    // Create OAuth2 client with saved credentials
    const callbackOAuth2Client = new google.auth.OAuth2(
      savedCredentials.clientId,
      savedCredentials.clientSecret,
      REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await callbackOAuth2Client.getToken(code);
    
    // Store tokens securely
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      created_at: new Date()
    };

    // Save tokens to file
    await fs.ensureDir(path.dirname(path.join(__dirname, '../config/youtube_tokens.json')));
    await fs.writeJson(path.join(__dirname, '../config/youtube_tokens.json'), tokenData);

    logger.info('YouTube authentication successful');
    
    // Redirect to success page
    res.redirect('/?auth=success');
  } catch (error) {
    logger.error('Error handling YouTube callback:', error);
    res.redirect('/?auth=error&message=' + encodeURIComponent(error.message));
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

const saveCredentials = async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Client Secret are required'
      });
    }

    // Validate Client ID format
    if (!clientId.includes('.googleusercontent.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Client ID format. Should end with .googleusercontent.com'
      });
    }

    // Save credentials to environment or config file
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    await fs.ensureDir(path.dirname(credentialsPath));
    
    await fs.writeJson(credentialsPath, {
      clientId,
      clientSecret,
      updated_at: new Date()
    });

    // Update OAuth2 client with new credentials
    const newOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    );
    
    // Replace the global oauth2Client properties
    oauth2Client._clientId = clientId;
    oauth2Client._clientSecret = clientSecret;

    logger.info('YouTube credentials saved successfully');
    
    res.json({
      success: true,
      message: 'Credentials saved successfully. You can now authenticate with YouTube.'
    });
  } catch (error) {
    logger.error('Error saving credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving credentials',
      error: error.message
    });
  }
};

const getAuthStatus = async (req, res) => {
  try {
    const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
    
    if (!await fs.pathExists(tokenPath)) {
      return res.json({
        success: true,
        authenticated: false
      });
    }

    const tokens = await fs.readJson(tokenPath);
    
    // Check if tokens are valid
    if (tokens.access_token) {
      // Load saved credentials for OAuth client
      const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
      if (await fs.pathExists(credentialsPath)) {
        const savedCredentials = await fs.readJson(credentialsPath);
        const currentOAuth2Client = new google.auth.OAuth2(
          savedCredentials.clientId,
          savedCredentials.clientSecret,
          REDIRECT_URI
        );
        currentOAuth2Client.setCredentials(tokens);
        
        try {
          const oauth2 = google.oauth2({ version: 'v2', auth: currentOAuth2Client });
          const userInfo = await oauth2.userinfo.get();
          
          res.json({
            success: true,
            authenticated: true,
            userInfo: {
              email: userInfo.data.email,
              name: userInfo.data.name,
              picture: userInfo.data.picture
            }
          });
        } catch (error) {
          logger.warn('Failed to get user info, but tokens exist:', error.message);
          res.json({
            success: true,
            authenticated: true,
            userInfo: null
          });
        }
      } else {
        res.json({
          success: true,
          authenticated: false
        });
      }
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    logger.error('Error checking auth status:', error);
    res.json({
      success: true,
      authenticated: false
    });
  }
};

const disconnectAuth = async (req, res) => {
  try {
    const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
    
    // Delete token file
    if (await fs.pathExists(tokenPath)) {
      await fs.remove(tokenPath);
      logger.info('YouTube tokens deleted successfully');
    }
    
    // Clear OAuth2 client credentials
    oauth2Client.setCredentials({});
    
    res.json({
      success: true,
      message: 'Successfully disconnected from YouTube'
    });
  } catch (error) {
    logger.error('Error disconnecting from YouTube:', error);
    res.status(500).json({
      success: false,
      message: 'Error disconnecting from YouTube',
      error: error.message
    });
  }
};

module.exports = {
  initiateAuth,
  handleCallback,
  uploadToYoutube,
  getUploadStatus,
  saveCredentials,
  getAuthStatus,
  disconnectAuth,
  ensureValidTokens,
  uploadJobs
}; 