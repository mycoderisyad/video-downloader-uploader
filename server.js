const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const videoController = require('./controllers/videoController');
const youtubeController = require('./controllers/youtubeController');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.googleapis.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Terlalu banyak request dari IP ini, coba lagi nanti.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: ['https://prafunschool.web.id', 'http://localhost:3000'],
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

// API Routes
app.post('/api/download', videoController.downloadVideo);
app.post('/api/upload-youtube', youtubeController.uploadToYoutube);
app.get('/api/download-status/:jobId', videoController.getDownloadStatus);
app.get('/api/upload-status/:jobId', youtubeController.getUploadStatus);
app.delete('/api/cleanup/:jobId', videoController.cleanupFiles);
app.get('/api/auth/youtube', youtubeController.initiateAuth);
app.get('/api/auth/youtube/callback', youtubeController.handleCallback);

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
      logger.info(`Local access: http://127.0.0.1:${PORT}`);
      logger.info(`Domain access: https://prafunschool.web.id`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://127.0.0.1:${PORT}`);
      console.log(`🌍 Domain: https://prafunschool.web.id`);
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