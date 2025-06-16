#!/bin/bash

# Video Downloader & YouTube Uploader - Installation Script
# For prafunschool.web.id

echo "🚀 Installing Video Downloader & YouTube Uploader..."
echo "=================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed"
fi

# Install FFmpeg if not installed
if ! command -v ffmpeg &> /dev/null; then
    echo "📥 Installing FFmpeg..."
    sudo apt install -y ffmpeg
else
    echo "✅ FFmpeg already installed"
fi

# Install other dependencies
echo "📥 Installing additional dependencies..."
sudo apt install -y curl wget git

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p downloads uploads temp logs config

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 downloads uploads temp logs config

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your YouTube API credentials"
else
    echo "✅ Environment file already exists"
fi

# Install PM2 for production
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Create PM2 ecosystem file
echo "📝 Creating PM2 configuration..."
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'video-downloader',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3031
    }
  }]
};
EOL

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/video-downloader.service > /dev/null << EOL
[Unit]
Description=Video Downloader & YouTube Uploader
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Enable and start service
echo "🚀 Enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable video-downloader

# Create nginx configuration
echo "🌐 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/video-downloader << EOL
server {
    listen 80;
    server_name prafunschool.web.id;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name prafunschool.web.id;

    # SSL configuration (add your SSL certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # File upload size limit
        client_max_body_size 2G;
    }
}
EOL

# Enable nginx site
if [ -f /etc/nginx/sites-available/video-downloader ]; then
    sudo ln -sf /etc/nginx/sites-available/video-downloader /etc/nginx/sites-enabled/
    echo "✅ Nginx configuration created"
fi

# Test nginx configuration
if command -v nginx &> /dev/null; then
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "✅ Nginx configuration updated"
    else
        echo "⚠️  Nginx configuration has errors"
    fi
fi

# Create startup script
echo "📝 Creating startup script..."
cat > start.sh << EOL
#!/bin/bash
echo "🚀 Starting Video Downloader & YouTube Uploader..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ Application started successfully!"
echo "🌐 Access your application at: https://prafunschool.web.id"
EOL

chmod +x start.sh

# Create stop script
cat > stop.sh << EOL
#!/bin/bash
echo "🛑 Stopping Video Downloader & YouTube Uploader..."
pm2 stop ecosystem.config.js
echo "✅ Application stopped"
EOL

chmod +x stop.sh

# Final instructions
echo ""
echo "🎉 Installation completed successfully!"
echo "=================================================="
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your YouTube API credentials:"
echo "   nano .env"
echo ""
echo "2. Configure SSL certificates in nginx (if needed):"
echo "   sudo nano /etc/nginx/sites-available/video-downloader"
echo ""
echo "3. Start the application:"
echo "   ./start.sh"
echo ""
echo "4. Access your application:"
echo "   🌐 https://prafunschool.web.id"
echo ""
echo "📚 Additional commands:"
echo "   - Start: ./start.sh"
echo "   - Stop: ./stop.sh"
echo "   - Logs: pm2 logs video-downloader"
echo "   - Monitor: pm2 monit"
echo ""
echo "📞 Support: support@prafunschool.web.id"
echo "==================================================" 