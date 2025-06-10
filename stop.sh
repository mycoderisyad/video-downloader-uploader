#!/bin/bash
echo "🛑 Stopping Video Downloader & YouTube Uploader..."
pm2 stop ecosystem.config.js
echo "✅ Application stopped"
