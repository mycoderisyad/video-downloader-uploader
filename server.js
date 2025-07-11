const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const videoController = require('./controllers/videoController');
const youtubeController = require('./controllers/youtubeController');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3031;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:", "data:"],
      connectSrc: ["'self'", "https://www.googleapis.com", "https://cdn.jsdelivr.net"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      upgradeInsecureRequests: []
    }
  }
}));

// CORS configuration - Allow configurable origins
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3031', 'http://127.0.0.1:3031']; // Default fallback

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static('public'));

// Create necessary directories
const createDirectories = async () => {
  try {
    await fs.ensureDir('./downloads');
    await fs.ensureDir('./uploads');
    await fs.ensureDir('./temp');
    logger.info('Directories created successfully');
  } catch (error) {
    logger.error('Error creating directories:', error);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Documentation route
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

// API Routes
app.post('/api/download', videoController.downloadVideo);
app.post('/api/upload-youtube', youtubeController.uploadToYoutube);
app.post('/api/upload-via-link', youtubeController.uploadViaLink);
app.get('/api/download-status/:jobId', videoController.getDownloadStatus);
app.get('/api/upload-status/:jobId', youtubeController.getUploadStatus);
app.delete('/api/cleanup/:jobId', videoController.cleanupFiles);
app.get('/api/auth/youtube', youtubeController.initiateAuth);
app.post('/api/auth/youtube', youtubeController.initiateAuth);
app.get('/api/auth/youtube/callback', youtubeController.handleCallback);

// New API Routes
app.post('/api/preview', videoController.previewVideo);
app.get('/api/download-file/:jobId', videoController.downloadFile);
app.post('/api/save-credentials', youtubeController.saveCredentials);
app.get('/api/auth/status', youtubeController.getAuthStatus);
app.post('/api/auth/status', youtubeController.getAuthStatus);
app.post('/api/auth/disconnect', youtubeController.disconnectAuth);
app.post('/api/auth/refresh', youtubeController.refreshAuth);
app.delete('/api/clear-all', videoController.clearAllFiles);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

// Start server
const startServer = async () => {
  try {
    await createDirectories();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Local access: http://localhost:${PORT}`);
      logger.info(`Local access: http://127.0.0.1:${PORT}`);
      console.log(`🚀 Video Downloader & Uploader Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🌐 Local: http://127.0.0.1:${PORT}`);
      console.log(`🌍 Configure your domain in CORS_ORIGINS environment variable`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer(); 