#!/bin/bash

echo "Installing Dependencies for Video Downloader & Uploader"
echo "======================================================="

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Check for system dependencies
echo "Checking system dependencies..."

# Check for yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "WARNING: yt-dlp not found. Install with:"
    echo "   pip3 install yt-dlp"
fi

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "WARNING: FFmpeg not found. This is required for video processing."
    echo "   To install FFmpeg:"
    
    # Detect OS and provide appropriate instructions
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
        echo "   Windows: Run as Administrator:"
        echo "     PowerShell -ExecutionPolicy Bypass -File install-ffmpeg-windows.ps1"
        echo "   Or manually download from: https://ffmpeg.org/download.html"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   Linux: Run ./install-ffmpeg-linux.sh"
        echo "   Or manually: sudo apt install ffmpeg (Ubuntu/Debian)"
        echo "                sudo dnf install ffmpeg (Fedora/RHEL)"
        echo "                sudo pacman -S ffmpeg (Arch)"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   macOS: brew install ffmpeg"
    else
        echo "   Check: https://ffmpeg.org/download.html"
    fi
    echo ""
    echo "   NOTE: The application will attempt to auto-detect FFmpeg location"
    echo "      You can also set FFMPEG_PATH environment variable"
else
    echo "SUCCESS: FFmpeg found: $(ffmpeg -version 2>/dev/null | head -n 1 | cut -d' ' -f1-3)"
fi

# Check for PM2
if ! command -v pm2 &> /dev/null; then
    echo "WARNING: PM2 not found. Install with:"
    echo "   npm install -g pm2"
fi

echo "Dependency check completed!"
echo "Run './setup.sh' for complete configuration" 