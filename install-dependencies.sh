#!/bin/bash

echo "🚀 Installing Video Downloader & Uploader Dependencies"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "🔍 Detected OS: $OS"

# Install system dependencies
echo "📦 Installing system dependencies..."

if [[ "$OS" == "linux" ]]; then
    # Update package list
    sudo apt update
    
    # Install FFmpeg
    echo "🎬 Installing FFmpeg..."
    sudo apt install -y ffmpeg
    
    # Install Python and pip (required for yt-dlp)
    echo "🐍 Installing Python and pip..."
    sudo apt install -y python3 python3-pip
    
    # Install yt-dlp
    echo "📺 Installing yt-dlp..."
    sudo pip3 install yt-dlp
    
elif [[ "$OS" == "macos" ]]; then
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "🍺 Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install FFmpeg
    echo "🎬 Installing FFmpeg..."
    brew install ffmpeg
    
    # Install Python (if not already installed)
    echo "🐍 Installing Python..."
    brew install python
    
    # Install yt-dlp
    echo "📺 Installing yt-dlp..."
    pip3 install yt-dlp
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p downloads uploads temp logs exports batch data config

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 downloads uploads temp logs exports batch data config

# Create config directory structure
mkdir -p config

# Verify installations
echo "✅ Verifying installations..."

# Check FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg: $(ffmpeg -version | head -n1)"
else
    echo "❌ FFmpeg installation failed"
fi

# Check yt-dlp
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp: $(yt-dlp --version)"
else
    echo "❌ yt-dlp installation failed"
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy env.example to .env and configure your settings"
echo "2. Set up YouTube OAuth credentials in the Settings tab"
echo "3. Run 'npm start' to start the application"
echo ""
echo "📚 For more information, check the README.md file"
echo ""
echo "🔧 Troubleshooting:"
echo "- If yt-dlp fails to install, try: pip3 install --user yt-dlp"
echo "- If FFmpeg is not found, make sure it's in your PATH"
echo "- For permission issues, check directory ownership"
echo "" 