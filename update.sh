#!/bin/bash

echo "Updating Video Downloader & Uploader..."

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    exit 1
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Update dependencies
echo "Updating dependencies..."
npm install

# Restart if using PM2
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    ./stop.sh
    ./start.sh
else
    echo "INFO: Please restart the application manually"
fi

echo "Update completed!" 