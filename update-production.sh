#!/bin/bash

echo "🔄 Updating Video Downloader & YouTube Uploader Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git is not installed!"
    exit 1
fi

# Check if PM2 is available
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed!"
    exit 1
fi

print_status "Stopping current application..."
pm2 stop ecosystem.config.js 2>/dev/null || print_warning "Application was not running"

print_status "Pulling latest changes from repository..."
git fetch origin
git reset --hard origin/main

print_status "Installing/updating dependencies..."
npm install --production

print_status "Creating necessary directories..."
mkdir -p downloads uploads temp logs batch exports data config

print_status "Setting proper permissions..."
chmod +x *.sh

print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

print_status "Saving PM2 configuration..."
pm2 save

print_status "Checking application status..."
sleep 3
pm2 status

print_success "Production update completed!"
print_success "Application is now running with the latest changes"
print_success "Access your application at: https://prafunschool.web.id"

# Show recent logs
print_status "Recent application logs:"
pm2 logs video-downloader --lines 10 --nostream 