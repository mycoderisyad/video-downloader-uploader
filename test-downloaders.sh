#!/bin/bash

echo "🧪 Testing Multi-Downloader System"
echo "=================================="

# Test yt-dlp
echo ""
echo "1. Testing yt-dlp..."
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp is installed"
    yt-dlp --version
else
    echo "❌ yt-dlp not found"
    echo "Install with: pip3 install yt-dlp"
fi

# Test gallery-dl
echo ""
echo "2. Testing gallery-dl..."
if command -v gallery-dl &> /dev/null; then
    echo "✅ gallery-dl is installed"
    gallery-dl --version
else
    echo "❌ gallery-dl not found"
    echo "Install with: pip3 install gallery-dl"
fi

# Test youtube-dl
echo ""
echo "3. Testing youtube-dl..."
if command -v youtube-dl &> /dev/null; then
    echo "✅ youtube-dl is installed"
    youtube-dl --version
else
    echo "❌ youtube-dl not found"
    echo "Install with: pip3 install youtube-dl"
fi

# Test you-get
echo ""
echo "4. Testing you-get..."
if command -v you-get &> /dev/null; then
    echo "✅ you-get is installed"
    you-get --version
else
    echo "❌ you-get not found"
    echo "Install with: pip3 install you-get"
fi

# Test youtube-dl-exec (Node.js package)
echo ""
echo "5. Testing youtube-dl-exec (Node.js)..."
if npm list youtube-dl-exec &> /dev/null; then
    echo "✅ youtube-dl-exec is installed"
    node -e "console.log('youtube-dl-exec version:', require('youtube-dl-exec/package.json').version)"
else
    echo "❌ youtube-dl-exec not found"
    echo "Install with: npm install youtube-dl-exec"
fi

# Test FFmpeg
echo ""
echo "6. Testing FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg is installed"
    ffmpeg -version | head -1
else
    echo "❌ FFmpeg not found"
    echo "Install with: sudo apt install ffmpeg"
fi

# Test Node.js
echo ""
echo "7. Testing Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed"
    node --version
else
    echo "❌ Node.js not found"
fi

# Test PM2
echo ""
echo "8. Testing PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    pm2 --version
else
    echo "❌ PM2 not found"
    echo "Install with: npm install -g pm2"
fi

echo ""
echo "🔧 Application Status:"
pm2 status

echo ""
echo "📊 System Summary:"
echo "=================="

# Count installed downloaders
DOWNLOADERS=0
if command -v yt-dlp &> /dev/null; then ((DOWNLOADERS++)); fi
if command -v gallery-dl &> /dev/null; then ((DOWNLOADERS++)); fi
if command -v youtube-dl &> /dev/null; then ((DOWNLOADERS++)); fi
if command -v you-get &> /dev/null; then ((DOWNLOADERS++)); fi
if npm list youtube-dl-exec &> /dev/null; then ((DOWNLOADERS++)); fi

echo "✅ Downloaders installed: $DOWNLOADERS/5"

if command -v ffmpeg &> /dev/null; then
    echo "✅ Video processing: Available"
else
    echo "❌ Video processing: Not available"
fi

if command -v node &> /dev/null; then
    echo "✅ Runtime: Available"
else
    echo "❌ Runtime: Not available"
fi

echo ""
echo "🎯 Platform Support:"
echo "==================="
echo "✅ YouTube: youtube-dl-exec + yt-dlp + youtube-dl (fallback)"
echo "✅ Instagram: gallery-dl (primary) + yt-dlp + you-get (fallback)"
echo "✅ Facebook: gallery-dl (primary) + yt-dlp + you-get (fallback)"
echo "✅ Vimeo: yt-dlp + you-get"
echo "✅ TikTok: yt-dlp + you-get"
echo "✅ Twitter/X: yt-dlp + you-get"
echo "✅ M3U8 Streams: FFmpeg"
echo "✅ User Choice: Dropdown selection untuk platform sosmed"

echo ""
echo "🚀 Ready to test! Try downloading from different platforms:"
echo "- YouTube: http://localhost:3000"
echo "- Instagram: Use gallery-dl for better results"
echo "- Facebook: Use gallery-dl for better results"
echo "- Other platforms: yt-dlp will handle them"

echo ""
echo "⚠️  Known Issues & Solutions:"
echo "- YouTube direct download may fail due to bot detection"
echo "- Use 'Server Download' mode for YouTube for best results"
echo "- Social media platforms work better with gallery-dl"
echo "- YouTube auth is now per-user (not global)"
echo "- yt-dlp has cookie support and youtube-dl fallback" 