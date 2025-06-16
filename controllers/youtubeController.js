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

// Per-user credentials storage (temporary, for auth flow)
const userCredentials = new Map();

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
    let clientId, clientSecret, redirectUri;
    
    // Check if credentials are provided in request body (local-only mode)
    if (req.body && req.body.clientId && req.body.clientSecret) {
      clientId = req.body.clientId;
      clientSecret = req.body.clientSecret;
      redirectUri = req.body.redirectUri || REDIRECT_URI;
      
      logger.info('Using credentials from request (local-only mode)');
    } else {
      // Fallback to saved credentials file (legacy mode)
      const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
      
      if (await fs.pathExists(credentialsPath)) {
        const savedCredentials = await fs.readJson(credentialsPath);
        clientId = savedCredentials.clientId;
        clientSecret = savedCredentials.clientSecret;
        redirectUri = savedCredentials.redirectUri || REDIRECT_URI;
        
        logger.info('Using credentials from file (legacy mode)');
      } else {
        // Try environment variables as last resort
        clientId = CLIENT_ID;
        clientSecret = CLIENT_SECRET;
        redirectUri = REDIRECT_URI;
        
        if (clientId && clientSecret) {
          logger.info('Using credentials from environment variables');
        }
      }
    }

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        message: 'YouTube credentials not provided. Please save your credentials in Settings first.',
        requireCredentials: true
      });
    }

    // Get user session ID
    const userSessionId = getUserSessionId(req);

    // Store credentials temporarily for this user session (for callback)
    userCredentials.set(userSessionId, {
      clientId,
      clientSecret,
      redirectUri,
      timestamp: Date.now()
    });

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

    // Try to get credentials from user session first
    let clientId, clientSecret, redirectUri;
    
    // First try user session credentials (from initiate auth)
    if (userCredentials.has(state)) {
      const sessionCreds = userCredentials.get(state);
      clientId = sessionCreds.clientId;
      clientSecret = sessionCreds.clientSecret;
      redirectUri = sessionCreds.redirectUri;
      
      // Clean up temporary credentials
      userCredentials.delete(state);
      
      logger.info('Using session credentials for callback');
    } else {
      // Fallback to saved credentials file
      const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
      if (await fs.pathExists(credentialsPath)) {
        const savedCredentials = await fs.readJson(credentialsPath);
        clientId = savedCredentials.clientId;
        clientSecret = savedCredentials.clientSecret;
        redirectUri = savedCredentials.redirectUri || REDIRECT_URI;
        
        logger.info('Using saved credentials for callback');
      } else {
        // Last resort: environment variables
        clientId = CLIENT_ID;
        clientSecret = CLIENT_SECRET;
        redirectUri = REDIRECT_URI;
        
        if (clientId && clientSecret) {
          logger.info('Using environment credentials for callback');
        }
      }
    }
    
    if (!clientId || !clientSecret) {
      logger.error('No credentials available for callback');
      return res.redirect('/?auth=error&message=' + encodeURIComponent('No credentials found'));
    }
    
    // Create OAuth2 client with available credentials
    const callbackOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
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

// Upload via direct link (new feature)
const uploadViaLink = async (req, res) => {
  try {
    const {
      url,
      title,
      description = '',
      tags = [],
      category = '22', // People & Blogs
      privacy = 'private',
      quality = 'best'
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Video URL diperlukan'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Video title diperlukan'
      });
    }

    // Check authentication first
    const userSessionId = getUserSessionId(req);
    const userTokenData = userTokens.get(userSessionId);
    
    if (!userTokenData) {
      return res.status(401).json({
        success: false,
        message: 'YouTube authentication required. Please authenticate first.',
        requireAuth: true
      });
    }

    // Create combined job ID for tracking both download and upload
    const combinedJobId = uuidv4();
    
    // Create upload job with initial status
    uploadJobs.set(combinedJobId, {
      status: 'downloading', // First phase: downloading
      progress: 0,
      downloadUrl: url,
      title: title.trim(),
      description,
      tags,
      category,
      privacy,
      quality,
      startTime: new Date(),
      error: null,
      videoId: null,
      userSessionId: userSessionId,
      type: 'direct-upload', // Mark as direct upload
      phase: 'download' // Current phase
    });

    // Send immediate response
    res.json({
      success: true,
      jobId: combinedJobId,
      uploadJobId: combinedJobId,
      message: 'Direct upload started - downloading video first',
      status: 'downloading'
    });

    // Start the download-then-upload process asynchronously
    startDirectUploadProcess(combinedJobId, url, {
      title: title.trim(),
      description,
      tags,
      category,
      privacy,
      quality
    }, userSessionId);

  } catch (error) {
    logger.error('Error in uploadViaLink:', error);
    res.status(500).json({
      success: false,
      message: 'Error memulai direct upload',
      error: error.message
    });
  }
};

const uploadToYoutube = async (req, res) => {
  try {
    // Check authentication first
    const userSessionId = getUserSessionId(req);
    const userTokenData = userTokens.get(userSessionId);
    
    if (!userTokenData) {
      return res.status(401).json({
        success: false,
        message: 'YouTube authentication required. Please authenticate first.',
        requireAuth: true
      });
    }

    const {
      downloadJobId, // Frontend sends downloadJobId
      jobId, // Fallback for compatibility
      title,
      description = '',
      tags = [],
      category = '22', // People & Blogs
      privacy = 'private'
    } = req.body;

    const actualJobId = downloadJobId || jobId; // Use downloadJobId first, then jobId

    if (!actualJobId) {
      return res.status(400).json({
        success: false,
        message: 'Download Job ID diperlukan'
      });
    }

    // Check if download job exists and is completed
    const downloadJob = downloadJobs.get(actualJobId);
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

    oauth2Client.setCredentials(userTokenData);

    // Create upload job
    const uploadJobId = uuidv4();
    uploadJobs.set(uploadJobId, {
      status: 'starting',
      progress: 0,
      downloadJobId: actualJobId,
      title: title || downloadJob.title,
      description,
      tags,
      category,
      privacy,
      startTime: new Date(),
      error: null,
      videoId: null,
      userSessionId: userSessionId
    });

    // Send immediate response
    res.json({
      success: true,
      jobId: uploadJobId, // For compatibility with frontend
      uploadJobId, // Also include this for clarity
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
    }, userSessionId);

  } catch (error) {
    logger.error('Error in uploadToYoutube:', error);
    res.status(500).json({
      success: false,
      message: 'Error memulai upload ke YouTube',
      error: error.message
    });
  }
};

// Process for direct upload: download then upload then cleanup
const startDirectUploadProcess = async (jobId, url, metadata, userSessionId) => {
  const sanitize = require('sanitize-filename');
  const { spawn } = require('child_process');
  
  try {
    // Update status to downloading
    updateUploadStatus(jobId, 'downloading', 0);
    
    // Create temporary file path
    const sanitizedTitle = sanitize(metadata.title || `direct_upload_${Date.now()}`);
    const tempVideoPath = path.join(__dirname, '../temp', `${sanitizedTitle}_${jobId}.mp4`);
    
    // Ensure temp directory exists
    await fs.ensureDir(path.dirname(tempVideoPath));
    
    logger.info(`Starting direct upload process for job ${jobId}: ${url}`);
    
    // Download video using yt-dlp
    const downloadPromise = new Promise((resolve, reject) => {
      const args = [
        '--format', getYtDlpFormat(metadata.quality),
        '--output', tempVideoPath,
        '--no-playlist',
        '--no-warnings',
        '--progress',
        url
      ];
      
      const ytDlp = spawn('yt-dlp', args);
      
      ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        parseDirectUploadProgress(jobId, output, 'download');
      });
      
      ytDlp.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('%')) {
          parseDirectUploadProgress(jobId, output, 'download');
        }
      });
      
      ytDlp.on('close', (code) => {
        if (code === 0) {
          logger.info(`Download completed for direct upload job ${jobId}`);
          resolve(tempVideoPath);
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });
      
      ytDlp.on('error', (error) => {
        reject(new Error(`Download process error: ${error.message}`));
      });
    });
    
    // Wait for download to complete
    const downloadedPath = await downloadPromise;
    
    // Verify file exists and has content
    if (!await fs.pathExists(downloadedPath)) {
      throw new Error('Downloaded file not found');
    }
    
    const fileStats = await fs.stat(downloadedPath);
    if (fileStats.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    logger.info(`Download completed, file size: ${fileStats.size} bytes`);
    
    // Update status to uploading
    const uploadJob = uploadJobs.get(jobId);
    if (uploadJob) {
      uploadJob.phase = 'upload';
      uploadJob.status = 'uploading';
      uploadJob.progress = 0;
      uploadJob.downloadedPath = downloadedPath;
    }
    
    // Start YouTube upload
    await startYouTubeUpload(jobId, downloadedPath, metadata, userSessionId, true); // true = cleanup after upload
    
  } catch (error) {
    logger.error(`Direct upload process failed for job ${jobId}:`, error);
    updateUploadStatus(jobId, 'error', 0, error.message);
    
    // Cleanup on error
    const uploadJob = uploadJobs.get(jobId);
    if (uploadJob && uploadJob.downloadedPath) {
      try {
        await fs.unlink(uploadJob.downloadedPath);
        logger.info(`Cleaned up failed download file: ${uploadJob.downloadedPath}`);
      } catch (cleanupError) {
        logger.error(`Error cleaning up file: ${cleanupError.message}`);
      }
    }
  }
};

// Helper function to parse download progress for direct upload
const parseDirectUploadProgress = (jobId, output, phase) => {
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('%') && phase === 'download') {
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        // For download phase, use 0-50% of total progress
        const adjustedProgress = Math.min(50, percent / 2);
        updateUploadStatus(jobId, 'downloading', adjustedProgress);
      }
    }
  }
};

// Helper function to get yt-dlp format string
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

const startYouTubeUpload = async (uploadJobId, videoPath, metadata, userSessionId, cleanupAfter = false) => {
  try {
    updateUploadStatus(uploadJobId, 'uploading', 0);

    // First try to get tokens from user session
    let tokensFound = false;
    let tokensToUse = null;

    if (userSessionId && userTokens.has(userSessionId)) {
      tokensToUse = userTokens.get(userSessionId);
      logger.info(`Using user session tokens for upload ${uploadJobId}`);
      tokensFound = true;
    } else {
      // Fallback to checking global tokens file
      const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
      if (await fs.pathExists(tokenPath)) {
        tokensToUse = await fs.readJson(tokenPath);
        logger.info(`Using global tokens file for upload ${uploadJobId}`);
        tokensFound = true;
      }
    }

    if (!tokensFound || !tokensToUse) {
      throw new Error('YouTube authentication required. Please authenticate first.');
    }

    if (!tokensToUse.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate with YouTube.');
    }

    // Load saved credentials for OAuth client
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    if (!await fs.pathExists(credentialsPath)) {
      throw new Error('YouTube credentials not configured. Please save credentials in Settings first.');
    }

    const savedCredentials = await fs.readJson(credentialsPath);
    
    // Create OAuth2 client with saved credentials
    const uploadOAuth2Client = new google.auth.OAuth2(
      savedCredentials.clientId,
      savedCredentials.clientSecret,
      savedCredentials.redirectUri || REDIRECT_URI
    );

    // Set the tokens
    uploadOAuth2Client.setCredentials(tokensToUse);
    
    // Check if token needs refresh
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    
    if (tokensToUse.expiry_date && (tokensToUse.expiry_date - expiryBuffer) <= now) {
      logger.info('Access token expired, refreshing...');
      
      try {
        const { credentials } = await uploadOAuth2Client.refreshAccessToken();
        
        // Update tokens
        const updatedTokens = {
          ...tokensToUse,
          ...credentials,
          refresh_token: tokensToUse.refresh_token, // Preserve refresh token
          updated_at: new Date()
        };
        
        uploadOAuth2Client.setCredentials(updatedTokens);
        
        // Update user session tokens if that's what we're using
        if (userSessionId && userTokens.has(userSessionId)) {
          userTokens.set(userSessionId, updatedTokens);
        }
        
        logger.info('YouTube tokens refreshed successfully for upload');
      } catch (refreshError) {
        logger.error('Error refreshing tokens for upload:', refreshError);
        throw new Error('Token refresh failed. Please re-authenticate with YouTube.');
      }
    }
    
    logger.info('OAuth2 client credentials set successfully for upload');

    const youtube = google.youtube({ version: 'v3', auth: uploadOAuth2Client });

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
        let progress = (uploadedBytes / fileSize) * 100;
        
        // For direct upload, adjust progress to 50-100% range (download was 0-50%)
        const uploadJob = uploadJobs.get(uploadJobId);
        if (uploadJob && uploadJob.type === 'direct-upload') {
          progress = 50 + (progress / 2); // Map 0-100% upload to 50-100% total
        }
        
        updateUploadStatus(uploadJobId, 'uploading', progress);
      }
    }, 1000);

    logger.info(`Starting YouTube upload for job ${uploadJobId}`);
    const response = await youtube.videos.insert(uploadParams);

    clearInterval(progressInterval);

    if (response.data && response.data.id) {
      updateUploadStatus(uploadJobId, 'completed', 100, null, response.data.id);
      logger.info(`YouTube upload completed for job ${uploadJobId}, video ID: ${response.data.id}`);
      
      // Cleanup temporary file if this was a direct upload
      if (cleanupAfter) {
        try {
          await fs.unlink(videoPath);
          logger.info(`Cleaned up temporary file after successful upload: ${videoPath}`);
        } catch (cleanupError) {
          logger.error(`Error cleaning up temporary file: ${cleanupError.message}`);
        }
      }
    } else {
      throw new Error('Upload completed but no video ID returned');
    }

  } catch (error) {
    logger.error(`YouTube upload error for job ${uploadJobId}:`, error);
    
    // Log full error details for debugging
    logger.error('Full YouTube API error details:', {
      code: error.code,
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response object',
      config: error.config ? {
        method: error.config.method,
        url: error.config.url
      } : 'No config object'
    });
    
    let errorMessage = error.message;
    
    // Handle specific YouTube API errors
    if (error.response && error.response.data && error.response.data.error) {
      const apiError = error.response.data.error;
      logger.error('YouTube API specific error:', apiError);
      
      if (apiError.code === 403) {
        if (apiError.message && apiError.message.includes('quota')) {
          errorMessage = 'YouTube API quota habis untuk hari ini. Quota akan reset otomatis dalam 24 jam (UTC). Untuk upload lebih banyak, silakan request quota tambahan dari Google.';
        } else if (apiError.message && (apiError.message.includes('exceeded') || apiError.message.includes('limit'))) {
          errorMessage = 'Batas upload video YouTube untuk hari ini sudah terlampaui. Default limit: 6 video per hari (10,000 quota units). Quota akan reset otomatis besok. Untuk meningkatkan limit, request quota extension dari Google.';
        } else if (apiError.errors && apiError.errors.length > 0) {
          const firstError = apiError.errors[0];
          if (firstError.reason === 'quotaExceeded' || firstError.reason === 'rateLimitExceeded') {
            errorMessage = 'YouTube API quota atau rate limit terlampaui. Quota akan reset dalam 24 jam. Untuk upload lebih banyak, request quota extension dari Google Cloud Console.';
          } else if (firstError.reason === 'uploadLimitExceeded') {
            errorMessage = 'Batas upload video harian YouTube terlampaui. YouTube membatasi jumlah upload per channel per hari. Coba lagi besok atau hubungi YouTube support untuk peningkatan limit.';
          } else {
            errorMessage = `YouTube API Error: ${firstError.message || apiError.message}`;
          }
        } else {
          errorMessage = 'YouTube API access forbidden. Periksa permissions dan quota.';
        }
      } else if (apiError.code === 401) {
        errorMessage = 'Authentication expired or invalid. Please re-authenticate with YouTube.';
      } else {
        errorMessage = `YouTube API Error (${apiError.code}): ${apiError.message}`;
      }
    } else if (error.code === 401 || error.message.includes('No refresh token') || error.message.includes('invalid_grant')) {
      errorMessage = 'Authentication expired or invalid. Please re-authenticate with YouTube.';
      
      // Clear invalid tokens from both user session and global file
      const uploadJob = uploadJobs.get(uploadJobId);
      if (uploadJob && uploadJob.userSessionId && userTokens.has(uploadJob.userSessionId)) {
        userTokens.delete(uploadJob.userSessionId);
        logger.info(`Cleared invalid user session tokens for session: ${uploadJob.userSessionId.substring(0, 8)}...`);
      }
      
      const tokenPath = path.join(__dirname, '../config/youtube_tokens.json');
      if (await fs.pathExists(tokenPath)) {
        await fs.remove(tokenPath);
        logger.info('Cleared invalid YouTube tokens file');
      }
    } else if (error.code === 403) {
      // Check if this is a quota error specifically
      if (error.message.includes('quota') || error.message.includes('exceeded') || 
          error.message.includes('limit') || error.message.includes('dailyLimitExceeded')) {
        errorMessage = 'YouTube API quota habis untuk hari ini. Quota akan reset otomatis dalam 24 jam (UTC). Untuk upload lebih banyak, silakan request quota tambahan dari Google.';
      } else {
        errorMessage = 'YouTube API access forbidden. Periksa permissions dan quota.';
      }
    } else if (error.message.includes('quota')) {
      errorMessage = 'YouTube API quota habis untuk hari ini. Quota akan reset otomatis dalam 24 jam (UTC). Coba lagi besok atau request quota tambahan dari Google.';
    } else if (error.message.includes('dailyLimitExceeded') || error.message.includes('userRateLimitExceeded')) {
      errorMessage = 'Limit upload harian YouTube terlampaui. Quota akan reset dalam 24 jam. Untuk upload lebih banyak video per hari, silakan request quota extension dari Google Cloud Console.';
    } else if (error.message.includes('exceeded the number of videos')) {
      errorMessage = 'Batas upload video YouTube untuk hari ini sudah terlampaui. Default limit: 6 video per hari (10,000 quota units). Quota akan reset otomatis besok. Untuk meningkatkan limit, request quota extension dari Google.';
    } else if (error.message.includes('authentication')) {
      errorMessage = 'YouTube authentication failed. Please re-authenticate.';
    } else if (error.message.includes('refresh token')) {
      errorMessage = 'Authentication token expired. Please re-authenticate with YouTube.';
    }
    
    updateUploadStatus(uploadJobId, 'error', 0, errorMessage);
    
    // Cleanup temporary file if this was a direct upload and there was an error
    if (cleanupAfter) {
      try {
        await fs.unlink(videoPath);
        logger.info(`Cleaned up temporary file after upload error: ${videoPath}`);
      } catch (cleanupError) {
        logger.error(`Error cleaning up temporary file after error: ${cleanupError.message}`);
      }
    }
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

// Cleanup expired credentials (run every 10 minutes)
const cleanupExpiredCredentials = () => {
  const now = Date.now();
  const expireTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [sessionId, creds] of userCredentials.entries()) {
    if (now - creds.timestamp > expireTime) {
      userCredentials.delete(sessionId);
      logger.info(`Cleaned up expired credentials for session: ${sessionId.substring(0, 8)}...`);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredCredentials, 10 * 60 * 1000);

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

    // Try to get credentials from multiple sources
    let clientId, clientSecret, redirectUri;
    
    // First try: credentials from request body (local-only mode)
    if (req.body && req.body.clientId && req.body.clientSecret) {
      clientId = req.body.clientId;
      clientSecret = req.body.clientSecret;
      redirectUri = req.body.redirectUri || REDIRECT_URI;
      logger.info('Using credentials from request body for auth status check');
    } else {
      // Second try: saved credentials file
      const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
      if (await fs.pathExists(credentialsPath)) {
        const savedCredentials = await fs.readJson(credentialsPath);
        clientId = savedCredentials.clientId;
        clientSecret = savedCredentials.clientSecret;
        redirectUri = savedCredentials.redirectUri || REDIRECT_URI;
        logger.info('Using credentials from file for auth status check');
      } else {
        // Third try: environment variables
        clientId = CLIENT_ID;
        clientSecret = CLIENT_SECRET;
        redirectUri = REDIRECT_URI;
        
        if (!clientId || !clientSecret) {
          return res.json({
            success: true,
            authenticated: false,
            message: 'No credentials configured'
          });
        }
        logger.info('Using credentials from environment for auth status check');
      }
    }
    const currentOAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
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

const refreshAuth = async (req, res) => {
  try {
    // Get user session ID
    const userSessionId = getUserSessionId(req);
    const userTokenData = userTokens.get(userSessionId);
    
    if (!userTokenData || !userTokenData.refresh_token) {
      return res.status(401).json({
        success: false,
        message: 'No valid refresh token found. Please re-authenticate.',
        requireAuth: true
      });
    }

    // Load saved credentials
    const credentialsPath = path.join(__dirname, '../config/youtube_credentials.json');
    if (!await fs.pathExists(credentialsPath)) {
      return res.status(500).json({
        success: false,
        message: 'YouTube credentials not configured',
        requireCredentials: true
      });
    }

    const savedCredentials = await fs.readJson(credentialsPath);
    const refreshOAuth2Client = new google.auth.OAuth2(
      savedCredentials.clientId,
      savedCredentials.clientSecret,
      savedCredentials.redirectUri || REDIRECT_URI
    );

    refreshOAuth2Client.setCredentials(userTokenData);

    try {
      const { credentials } = await refreshOAuth2Client.refreshAccessToken();
      
      // Update tokens
      const updatedTokens = {
        ...userTokenData,
        ...credentials,
        refresh_token: userTokenData.refresh_token, // Preserve refresh token
        updated_at: new Date()
      };
      
      // Store updated tokens
      userTokens.set(userSessionId, updatedTokens);
      
      logger.info(`YouTube tokens refreshed successfully for session: ${userSessionId.substring(0, 8)}...`);
      
      res.json({
        success: true,
        message: 'Authentication refreshed successfully'
      });
    } catch (refreshError) {
      logger.error('Error refreshing tokens:', refreshError);
      
      // Remove invalid tokens
      userTokens.delete(userSessionId);
      
      res.status(401).json({
        success: false,
        message: 'Token refresh failed. Please re-authenticate.',
        requireAuth: true
      });
    }
  } catch (error) {
    logger.error('Error in refreshAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing authentication',
      error: error.message
    });
  }
};

module.exports = {
  initiateAuth,
  handleCallback,
  uploadToYoutube,
  uploadViaLink,
  getUploadStatus,
  saveCredentials,
  getAuthStatus,
  disconnectAuth,
  refreshAuth,
  ensureValidTokens,
  uploadJobs
}; 