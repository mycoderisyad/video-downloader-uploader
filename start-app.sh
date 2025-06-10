#!/bin/bash

echo "🚀 Starting Video Downloader & YouTube Uploader..."
echo "=================================================="

# Check if Node.js app is already running
if pgrep -f "node server.js" > /dev/null; then
    echo "📋 Node.js app is already running"
else
    echo "▶️  Starting Node.js application..."
    nohup npm start > app.log 2>&1 &
    sleep 3
    if pgrep -f "node server.js" > /dev/null; then
        echo "✅ Node.js application started successfully"
    else
        echo "❌ Failed to start Node.js application"
        exit 1
    fi
fi

# Check if nginx is running
if sudo systemctl is-active --quiet nginx; then
    echo "📋 Nginx is already running"
else
    echo "▶️  Starting Nginx..."
    sudo systemctl start nginx
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx started successfully"
    else
        echo "❌ Failed to start Nginx"
        exit 1
    fi
fi

echo ""
echo "🎉 All services are running!"
echo "=================================================="
echo "📱 Access your application:"
echo "   🌐 Local:  http://127.0.0.1:3000"
echo "   🌍 Domain: http://prafunschool.web.id"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f app.log"
echo ""
echo "🛑 Stop services:"
echo "   ./stop-app.sh"
echo "==================================================" 