#!/bin/bash
echo "🚀 Starting Video Downloader & YouTube Uploader..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ Application started successfully!"
echo "🌐 Access your application at: https://prafunschool.web.id"
