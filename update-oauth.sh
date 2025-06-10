#!/bin/bash

echo "🔧 YouTube OAuth Configuration Setup"
echo "===================================="
echo ""
echo "📋 Steps to configure YouTube OAuth:"
echo ""
echo "1. 🌐 Open Google Cloud Console:"
echo "   https://console.cloud.google.com"
echo ""
echo "2. 📊 Enable YouTube Data API v3:"
echo "   APIs & Services > Library > YouTube Data API v3 > Enable"
echo ""
echo "3. 🔑 Create OAuth 2.0 Credentials:"
echo "   APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID"
echo ""
echo "4. 🌍 Set Authorized redirect URIs:"
echo "   - https://prafunschool.web.id/api/auth/youtube/callback"
echo "   - http://127.0.0.1:3000/api/auth/youtube/callback"
echo ""
echo "5. 👥 Configure OAuth Consent Screen:"
echo "   - User Type: External"
echo "   - Add test users: excelraf@gmail.com"
echo "   - Add scopes: youtube.upload, youtube"
echo ""
echo "6. 💾 Update credentials below:"
echo ""

# Read current values from .env if exists
if [ -f .env ]; then
    source .env
fi

echo "Enter your YouTube OAuth credentials:"
echo ""

read -p "YouTube Client ID: " CLIENT_ID
read -p "YouTube Client Secret: " CLIENT_SECRET

# Update .env file
cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# YouTube API Configuration
YOUTUBE_CLIENT_ID=$CLIENT_ID
YOUTUBE_CLIENT_SECRET=$CLIENT_SECRET
YOUTUBE_REDIRECT_URI=https://prafunschool.web.id/api/auth/youtube/callback

# Security and Performance
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
CORS_ORIGINS=https://prafunschool.web.id,http://localhost:3000
EOF

echo ""
echo "✅ Environment file updated!"
echo ""
echo "🔄 Restarting application..."
./stop-app.sh
./start-app.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open: https://prafunschool.web.id"
echo "2. Try YouTube authentication"
echo "3. Make sure you're logged in as a test user: excelraf@gmail.com"
echo ""
echo "❓ If you get 'access blocked' error:"
echo "   - Add your email as test user in Google Console"
echo "   - Or submit app for verification (production)"
echo "" 