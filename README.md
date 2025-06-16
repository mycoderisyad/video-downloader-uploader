# 🎬 Video Downloader & YouTube Uploader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-blue.svg)](https://expressjs.com/)

**Aplikasi web lengkap untuk download video dari berbagai platform dan upload otomatis ke YouTube**

## ✨ Fitur Utama

### 🔽 Download Video
- **Multi-Platform Support**: YouTube, Instagram, TikTok, Facebook, Vimeo
- **Quality Selection**: 360p, 480p, 720p, 1080p, atau Best Quality
- **Batch Download**: Download multiple videos sekaligus
- **Real-time Progress**: Live progress tracking dengan speed & ETA
- **Smart URL Cleaning**: Otomatis membersihkan URL dari karakter tidak valid

### 📤 YouTube Upload
- **OAuth2 Authentication**: Secure Google authentication
- **Batch Upload**: Upload multiple videos sekaligus
- **Custom Metadata**: Title, description, tags, privacy settings
- **Progress Tracking**: Real-time upload progress monitoring
- **Local Credential Storage**: Credentials disimpan lokal untuk keamanan maksimal

### 🎯 User Experience
- **Modern UI**: Responsive design dengan Tailwind CSS
- **Dark Mode**: Toggle dark/light theme
- **Drag & Drop**: Upload files dengan drag and drop
- **History Management**: Track semua download/upload jobs
- **Toast Notifications**: Real-time feedback untuk semua actions
- **Tab Persistence**: Mengingat tab terakhir yang dibuka

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- FFmpeg (untuk video processing)
- PM2 (untuk production deployment)

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/mycoderisyad/video-downloader-uploader.git
cd video-downloader-uploader
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Environment**
```bash
cp env.example .env
# Edit .env file dengan konfigurasi Anda
```

4. **Install System Dependencies**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg yt-dlp

# Atau gunakan script otomatis
chmod +x install-dependencies.sh
./install-dependencies.sh
```

5. **Start Application**
```bash
# Development
npm run dev

# Production
npm start

# Dengan PM2
pm2 start ecosystem.config.js
```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Server Configuration
PORT=3031
NODE_ENV=production

# YouTube API (Optional - bisa diset via UI)
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/auth/youtube/callback
```

### YouTube API Setup

1. **Buat Project di Google Cloud Console**
   - Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
   - Buat project baru atau pilih existing project

2. **Enable YouTube Data API v3**
   - Di sidebar, pilih "APIs & Services" > "Library"
   - Cari "YouTube Data API v3" dan enable

3. **Buat OAuth2 Credentials**
   - Pilih "APIs & Services" > "Credentials"
   - Klik "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/youtube/callback`

4. **Configure di Aplikasi**
   - Buka aplikasi di browser
   - Masuk ke tab "Settings"
   - Masukkan Client ID, Client Secret, dan Redirect URI
   - Klik "Save Credentials"

## 📖 Usage Guide

### Download Video

1. **Single Download**
   - Paste URL video di tab "Download"
   - Pilih quality yang diinginkan
   - Klik "Download Video"
   - Monitor progress di real-time

2. **Batch Download**
   - Masukkan multiple URLs (satu per baris)
   - Pilih quality untuk semua video
   - Klik "Start Batch Download"

### Upload ke YouTube

1. **Setup Authentication**
   - Masuk ke tab "Settings"
   - Masukkan YouTube API credentials
   - Klik "Authenticate with YouTube"
   - Complete OAuth flow di browser

2. **Single Upload**
   - Pilih downloaded video dari dropdown
   - Isi title, description, privacy setting
   - Klik "Upload to YouTube"

3. **Batch Upload**
   - Pilih multiple videos dari list
   - Set default privacy dan tags
   - Klik "Start Batch Upload"

## 🏗️ Architecture

### Backend Structure
```
├── server.js              # Main server file
├── controllers/
│   ├── videoController.js # Download logic & file management
│   └── youtubeController.js # YouTube API & OAuth handling
├── utils/
│   └── logger.js          # Winston logging configuration
├── public/
│   ├── index.html         # Main UI
│   └── app.js            # Frontend JavaScript
├── downloads/             # Downloaded videos storage
├── uploads/              # Temporary upload files
├── config/               # Configuration files
└── logs/                 # Application logs
```

### Key Technologies
- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Video Processing**: FFmpeg, yt-dlp, youtube-dl-exec
- **Authentication**: Google OAuth2
- **Process Management**: PM2
- **Security**: Helmet.js, CORS

## 🔒 Security Features

- **Local Credential Storage**: YouTube credentials disimpan lokal, tidak di database
- **Session-based Auth**: Per-user authentication sessions
- **CORS Protection**: Configured untuk domain yang diizinkan
- **Helmet Security**: Security headers untuk production
- **Input Validation**: Sanitization untuk semua user inputs
- **Rate Limiting**: Built-in protection via proxy trust

## 📊 API Endpoints

### Download Endpoints
```
POST /api/download          # Start video download
GET  /api/download-status/:jobId # Get download progress
GET  /api/download-file/:jobId   # Download completed file
POST /api/preview           # Preview video info
```

### YouTube Endpoints
```
POST /api/auth/youtube      # Initiate OAuth flow
GET  /api/auth/youtube/callback # OAuth callback
GET  /api/auth/status       # Check auth status
POST /api/auth/status       # Check auth with credentials
POST /api/auth/disconnect   # Disconnect YouTube
POST /api/upload-youtube    # Upload video to YouTube
GET  /api/upload-status/:jobId # Get upload progress
```

### Utility Endpoints
```
POST /api/save-credentials  # Save YouTube credentials
DELETE /api/cleanup/:jobId  # Cleanup files
DELETE /api/clear-all       # Clear all files
```

## 🚀 Deployment

### Production Setup

1. **Server Requirements**
   - Ubuntu 20.04+ atau CentOS 8+
   - Node.js 18+
   - Nginx (recommended)
   - PM2 untuk process management

2. **Deploy dengan PM2**
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Setup auto-restart
pm2 startup
pm2 save
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **SSL dengan Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Auto-Update Script
```bash
# Gunakan script update otomatis
chmod +x update-production.sh
./update-production.sh
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server akan berjalan di http://localhost:3031
```

### Project Scripts
```bash
npm start          # Production start
npm run dev        # Development dengan nodemon
```

### Logging
- **Development**: Console output dengan colors
- **Production**: File logging di `logs/` directory
- **Levels**: Error, Warn, Info, Debug

## 🔧 Troubleshooting

### Common Issues

1. **FFmpeg not found**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

2. **yt-dlp outdated**
```bash
# Update yt-dlp
sudo pip3 install --upgrade yt-dlp
```

3. **Permission errors**
```bash
# Fix file permissions
chmod +x *.sh
sudo chown -R $USER:$USER downloads/ uploads/
```

4. **Port already in use**
```bash
# Check what's using port 3031
sudo lsof -i :3031

# Kill process if needed
sudo kill -9 <PID>
```

5. **YouTube quota exceeded**
   - YouTube API memiliki quota limit harian
   - Monitor usage di Google Cloud Console
   - Consider multiple API keys untuk high-volume usage

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start

# Check logs
tail -f logs/app.log
```

## 📈 Performance Tips

1. **Server Optimization**
   - Gunakan PM2 cluster mode untuk multiple cores
   - Setup Nginx untuk static file serving
   - Enable gzip compression

2. **Storage Management**
   - Auto-cleanup files older than 24 hours
   - Monitor disk space usage
   - Consider cloud storage untuk large files

3. **Network Optimization**
   - Use CDN untuk static assets
   - Enable HTTP/2
   - Optimize video quality vs file size

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow ESLint configuration
- Add tests untuk new features
- Update documentation
- Ensure backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
- [FFmpeg](https://ffmpeg.org/) - Video processing
- [Google APIs](https://developers.google.com/youtube) - YouTube integration
- [Tailwind CSS](https://tailwindcss.com/) - UI framework
- [Express.js](https://expressjs.com/) - Web framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mycoderisyad/video-downloader-uploader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mycoderisyad/video-downloader-uploader/discussions)
- **Email**: mycoderisyad@gmail.com

---

**Made with ❤️ by [mycoderisyad](https://github.com/mycoderisyad)**

> 🌟 Jika project ini membantu Anda, berikan star di GitHub! 