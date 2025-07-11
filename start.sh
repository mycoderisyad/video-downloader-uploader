#!/bin/bash
echo "Starting Video Downloader & YouTube Uploader..."
pm2 start ecosystem.config.js
pm2 save
echo "Application started successfully!"
echo "Local access: http://localhost:3031"
echo "Local access: http://127.0.0.1:3031"
echo "For production: Configure your domain in CORS_ORIGINS environment variable"
