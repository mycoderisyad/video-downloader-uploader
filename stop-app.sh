#!/bin/bash

echo "🛑 Stopping Video Downloader & YouTube Uploader..."
echo "=================================================="

# Stop Node.js application
echo "▶️  Stopping Node.js application..."
pkill -f "node server.js"
sleep 2

if pgrep -f "node server.js" > /dev/null; then
    echo "⚠️  Force stopping Node.js application..."
    pkill -9 -f "node server.js"
fi

if ! pgrep -f "node server.js" > /dev/null; then
    echo "✅ Node.js application stopped"
else
    echo "❌ Failed to stop Node.js application"
fi

# Optionally stop nginx (commented out to not affect other sites)
# echo "▶️  Stopping Nginx..."
# sudo systemctl stop nginx
# echo "✅ Nginx stopped"

echo ""
echo "🏁 Application stopped successfully!"
echo "=================================================="
echo "▶️  To start again: ./start-app.sh"
echo "==================================================" 