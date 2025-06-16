# Video Downloader & Uploader

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)]()

**Aplikasi web untuk download video dari berbagai platform dan upload ke YouTube dengan fitur lengkap dan antarmuka yang user-friendly.**

## Fitur Utama

### **Download Video**
- **Dual Download Mode**:
  - **Server Download**: Download ke server terlebih dahulu
  - **Direct Download**: Process di server lalu auto-download ke komputer user
- **Quality Selection**: 360p, 480p, 720p, 1080p, atau Best quality
- **Format Support**: M3U8, MP4, MKV, WebM dengan auto-conversion ke MP4
- **Batch Download**: Download multiple videos sekaligus
- **Real-time Progress**: Progress bar, speed, ETA, dan file size tracking

### **Upload ke YouTube**
- **OAuth2 Authentication**: Secure login dengan Google account
- **Persistent Login**: Login tersimpan sampai manual disconnect
- **Complete Metadata**: Title, description, tags, privacy settings, categories
- **Batch Upload**: Upload multiple videos sekaligus
- **Direct Links**: Tombol langsung ke video YouTube setelah upload berhasil

### **Job Management**
- **Complete History**: Track semua download dan upload jobs
- **Individual Actions**: Delete, download, atau view individual jobs
- **Bulk Operations**: Clear all, export/import history (JSON/CSV)
- **Real-time Status**: Live updates untuk semua active jobs
- **Auto Cleanup**: File otomatis terhapus setiap 24 jam untuk menghemat storage

### **User Interface**
- **Modern Design**: Tailwind CSS dengan dark mode support
- **Responsive**: Mobile-friendly design
- **Tab Navigation**: Organized interface dengan multiple tabs
- **Drag & Drop**: Upload files dengan drag and drop
- **Toast Notifications**: Real-time feedback untuk semua actions
- **Video Preview**: Preview video sebelum download

### **Technical Features**
- **Content Security Policy**: Secure CSP configuration
- **Rate Limiting**: Protection against abuse
- **Error Handling**: Comprehensive error handling dan logging
- **Auto Recovery**: Fallback mechanisms untuk reliability
- **Debugging Tools**: Built-in testing dan debugging functions

## Quick Start

### Prerequisites
- Node.js 18+ 
- FFmpeg (untuk video processing)
- **Multi-Downloader Support**:
  - **yt-dlp**: YouTube, Vimeo, dan platform umum
  - **gallery-dl**: Instagram, Facebook (lebih reliable)
  - **youtube-dl**: Fallback untuk YouTube

### Installation

 **Clone Repository**
```bash
git clone https://github.com/mycoderisyad/video-downloader-uploader.git
cd video-downloader-uploader
```

**Install Dependencies**
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

 **Start Application**
```bash
npm start
```

**Access Application**
```
http://localhost:3031
```

## Detailed Setup

### 🔧 System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y nodejs npm ffmpeg python3-pip
pip3 install yt-dlp
```

**CentOS/RHEL:**
```bash
sudo yum install -y nodejs npm ffmpeg python3-pip
pip3 install yt-dlp
```

**macOS:**
```bash
brew install node ffmpeg yt-dlp
```

**Windows:**
```bash
# Install Node.js dari https://nodejs.org/
# Install FFmpeg dari https://ffmpeg.org/
# Install yt-dlp: pip install yt-dlp
```

### YouTube OAuth Setup

1. **Google Cloud Console**
   - Buat project baru di [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Buat OAuth 2.0 credentials

2. **Configure Credentials**
   - Buka aplikasi → Settings tab
   - Masukkan Client ID dan Client Secret
   - Klik "Save Credentials"

3. **Authenticate**
   - Klik "Connect to YouTube"
   - Login dengan Google account
   - Grant permissions

## 🎯 Usage Guide

### Download Video

1. **Single Download**
   - Pilih tab "Download"
   - Masukkan video URL
   - Pilih quality dan download mode
   - Klik "Download Video"

2. **Batch Download**
   - Pilih tab "Batch Download"
   - Masukkan multiple URLs (satu per baris)
   - Pilih quality dan download mode
   - Klik "Start Batch Download"

3. **Download Modes**
   - **Server Download**: File disimpan di server, bisa diupload ke YouTube
   - **Direct Download**: File diprocess di server lalu auto-download ke komputer

### Upload ke YouTube

1. **Setup Authentication**
   - Buka tab "Settings"
   - Setup YouTube credentials
   - Connect ke YouTube

2. **Upload Video**
   - Pilih tab "Upload"
   - Pilih video dari completed downloads
   - Isi metadata (title, description, tags)
   - Pilih privacy setting
   - Klik "Upload to YouTube"

### Manage History

1. **View Jobs**
   - Buka tab "History"
   - Lihat semua download/upload jobs
   - Filter berdasarkan status atau type

2. **Individual Actions**
   - **Download**: Download file ke komputer
   - **Delete**: Hapus job dan file dari server
   - **View on YouTube**: Buka video di YouTube (untuk uploads)

3. **Bulk Actions**
   - **Clear All**: Hapus semua history dan files
   - **Export**: Export history ke JSON/CSV

## 🔧 API Documentation

### Download Endpoints

```javascript
// Start download
POST /api/download
{
  "url": "https://example.com/video.mp4",
  "title": "Video Title",
  "quality": "720p",
  "downloadMode": "direct"
}

// Get download status
GET /api/download-status/:jobId

// Download file
GET /api/download-file/:jobId

// Preview video
POST /api/preview
{
  "url": "https://example.com/video.mp4"
}
```

### Upload Endpoints

```javascript
// Upload to YouTube
POST /api/upload-youtube
{
  "jobId": "download-job-id",
  "title": "YouTube Title",
  "description": "Video description",
  "tags": ["tag1", "tag2"],
  "privacy": "public",
  "category": "22"
}

// Get upload status
GET /api/upload-status/:jobId
```

### Management Endpoints

```javascript
// Delete job and files
DELETE /api/cleanup/:jobId

// Clear all files
DELETE /api/clear-all

// YouTube authentication
GET /api/auth/youtube
GET /api/auth/youtube/callback
GET /api/auth/status
POST /api/auth/disconnect
```

## 🧪 Testing & Debugging

### Built-in Testing Functions

Buka Developer Console (F12) dan jalankan:

```javascript
// Test semua functionality
testApp();

// Test button functionality
testButtons();

// Test download functionality
testDownload();

// Test delete functionality
testDelete();
```


## 🚀 Deployment

### Production Setup

1. **Environment Variables**
```bash
NODE_ENV=production
PORT=3031
```

2. **Process Manager**
```bash
# Install PM2
npm install -g pm2

# Start with PM2
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
        proxy_cache_bypass $http_upgrade;
    }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Video processing
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
- [Tailwind CSS](https://tailwindcss.com/) - UI framework
- [Node.js](https://nodejs.org/) - Runtime environment
- [Express.js](https://expressjs.com/) - Web framework

---

**Made by [mycoderisyad](https://github.com/mycoderisyad)**