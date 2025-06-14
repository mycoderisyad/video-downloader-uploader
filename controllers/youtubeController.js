const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { downloadJobs } = require('./videoController');

// YouTube upload job storage
const uploadJobs = new Map();

// Per-user token storage
const userTokens = new Map();

// OAuth2 credentials - these should be set in .env file
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || `https://prafunschool.web.id/api/auth/youtube/callback`;

// Generate user session ID from request
const getUserSessionId = (req) => {
  // Use IP + User-Agent as unique identifier for user session
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || '';
  return require('crypto').createHash('md5').update(ip + userAgent).digest('hex');
};

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
    let redirectUri = REDIRECT_URI;
    
    if (await fs.pathExists(credentialsPath)) {
      const savedCredentials = await fs.readJson(credentialsPath);
      clientId = savedCredentials.clientId;
      clientSecret = savedCredentials.clientSecret;
      redirectUri = savedCredentials.redirectUri || REDIRECT_URI;
    }

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        message: 'YouTube credentials not configured. Please save your credentials in Settings first.',
        requireCredentials: true
      });
    }

    // Get user session ID
    const userSessionId = getUserSessionId(req);

    // Create OAuth2 client with current credentials
    const currentOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = currentOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: userSessionId // Use user session ID as state
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

    if (!state) {
      logger.error('No state parameter received');
      return res.redirect('/?auth=error&message=' + encodeURIComponent('Invalid authentication state'));
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
      savedCredentials.redirectUri || REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await callbackOAuth2Client.getToken(code);
    
    // Validate that we received a refresh token
    if (!tokens.refresh_token) {
      logger.error('No refresh token received from Google OAuth');
      return res.redirect('/?auth=error&message=' + encodeURIComponent('No refresh token received. Please ensure you grant offline access.'));
    }
    
    // Store tokens per user session
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      created_at: new Date(),
      userSessionId: state
    };

    // Store tokens in memory for this user session
    userTokens.set(state, tokenData);
    
    logger.info(`YouTube tokens saved successfully for user session: ${state.substring(0, 8)}...`);
    logger.info('YouTube authentication successful');
    
    // Redirect to success page with session info
    res.redirect(`/?auth=success&session=${state}`);
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

    // Get user session ID and check for stored tokens
    const userSessionId = getUserSessionId(req);
    const userTokenData = userTokens.get(userSessionId);
    
    if (!userTokenData) {
      return res.status(401).json({
        success: false,
        message: 'YouTube authentication required. Please authenticate first.',
        requireAuth: true
      });
    }

    oauth2Client.setCredentials(userTokenData);

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

    // Ensure we have valid tokens before proceeding
    const hasValidTokens = await ensureValidTokens();
    if (!hasValidTokens) {
      throw new Error('YouTube authentication required. Please authenticate first.');
    }

    // Double-check that we have refresh token
    const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
    if (await fs.pathExists(tokenPath)) {
      const tokens = await fs.readJson(tokenPath);
      if (!tokens.refresh_token) {
        throw new Error('No refresh token available. Please re-authenticate with YouTube.');
      }
      
      // Ensure oauth2Client has the latest tokens
      oauth2Client.setCredentials(tokens);
      logger.info('OAuth2 client credentials set successfully');
    } else {
      throw new Error('No authentication tokens found. Please authenticate with YouTube first.');
    }

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

    logger.info(`Starting YouTube upload for job ${uploadJobId}`);
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
    if (error.code === 401 || error.message.includes('No refresh token') || error.message.includes('invalid_grant')) {
      errorMessage = 'Authentication expired or invalid. Please re-authenticate with YouTube.';
      // Clear invalid tokens
      const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
      if (await fs.pathExists(tokenPath)) {
        await fs.remove(tokenPath);
        logger.info('Cleared invalid YouTube tokens');
      }
    } else if (error.code === 403) {
      errorMessage = 'YouTube API quota exceeded or insufficient permissions.';
    } else if (error.message.includes('quota')) {
      errorMessage = 'YouTube API quota exceeded. Please try again later.';
    } else if (error.message.includes('authentication')) {
      errorMessage = 'YouTube authentication failed. Please re-authenticate.';
    } else if (error.message.includes('refresh token')) {
      errorMessage = 'Authentication token expired. Please re-authenticate with YouTube.';
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
      logger.warn('No YouTube tokens file found');
      return false;
    }

    const tokens = await fs.readJson(tokenPath);
    
    // Check if we have refresh token
    if (!tokens.refresh_token) {
      logger.warn('No refresh token available in stored tokens');
      return false;
    }

    oauth2Client.setCredentials(tokens);

    // Check if token needs refresh (refresh 5 minutes before expiry)
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (tokens.expiry_date && (tokens.expiry_date - expiryBuffer) <= now) {
      logger.info('Access token expired or expiring soon, refreshing...');
      
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Merge new credentials with existing tokens (preserve refresh_token)
        const updatedTokens = {
          ...tokens,
          ...credentials,
          refresh_token: tokens.refresh_token, // Ensure refresh token is preserved
          updated_at: new Date()
        };
        
        oauth2Client.setCredentials(updatedTokens);
        
        // Save refreshed tokens
        await fs.writeJson(tokenPath, updatedTokens);
        
        logger.info('YouTube tokens refreshed successfully');
        return true;
      } catch (refreshError) {
        logger.error('Error refreshing YouTube tokens:', refreshError);
        
        // If refresh fails, the tokens might be invalid
        if (refreshError.message.includes('invalid_grant') || refreshError.message.includes('invalid_request')) {
          logger.warn('Refresh token is invalid, removing tokens file');
          await fs.remove(tokenPath);
        }
        
        return false;
      }
    }

    logger.info('YouTube tokens are valid and not expired');
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
    const { clientId, clientSecret, redirectUri } = req.body;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, Client Secret, and Redirect URI are required'
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
      redirectUri,
      updated_at: new Date()
    });

    // Update OAuth2 client with new credentials
    const newOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
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
    // Get user session ID and check for stored tokens
    const userSessionId = getUserSessionId(req);
    const userTokenData = userTokens.get(userSessionId);
    
    if (!userTokenData) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'Not authenticated for this session'
      });
    }

    if (!userTokenData.access_token || !userTokenData.refresh_token) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'Invalid tokens for this session'
      });
    }

    // Load saved credentials for OAuth client
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    if (!await fs.pathExists(credentialsPath)) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'No credentials configured'
      });
    }

    const savedCredentials = await fs.readJson(credentialsPath);
    const currentOAuth2Client = new google.auth.OAuth2(
      savedCredentials.clientId,
      savedCredentials.clientSecret,
      REDIRECT_URI
    );
    currentOAuth2Client.setCredentials(userTokenData);
    
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: currentOAuth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      logger.info(`YouTube tokens are valid for user session: ${userSessionId.substring(0, 8)}...`);
      
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
      logger.warn(`Failed to get user info for session ${userSessionId.substring(0, 8)}..., but tokens exist:`, error.message);
      res.json({
        success: true,
        authenticated: true,
        userInfo: null
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
    // Get user session ID and remove their tokens
    const userSessionId = getUserSessionId(req);
    
    if (userTokens.has(userSessionId)) {
      userTokens.delete(userSessionId);
      logger.info(`YouTube tokens deleted successfully for session: ${userSessionId.substring(0, 8)}...`);
    }
    
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