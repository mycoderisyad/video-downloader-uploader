# Video Downloader & YouTube Uploader

A comprehensive, modern web application for downloading videos from multiple platforms and uploading them to YouTube. Built with Node.js, Express, and a beautiful Tailwind CSS interface.

## ✨ Features

### 🎬 Video Preview & Download
- **Video Preview**: Preview videos before downloading with metadata display
- **Single Download**: Download individual videos with quality selection
- **Batch Download**: Download multiple videos simultaneously
- **Direct Download**: Download videos directly to user's computer
- **Multi-Platform Support**: YouTube, Vimeo, Facebook, Instagram, and direct video URLs
- **Quality Selection**: Choose from 360p, 480p, 720p, 1080p, or best available

### 📤 Upload & Management
- **Single Upload**: Upload individual videos to YouTube
- **Batch Upload**: Upload multiple videos at once
- **Drag & Drop**: Intuitive file upload interface
- **YouTube Integration**: Full OAuth2 authentication with Google
- **Privacy Settings**: Control video visibility (Private, Unlisted, Public)
- **Metadata Management**: Set titles, descriptions, tags, and categories

### 📊 History & Progress
- **Job History**: Complete history of all downloads and uploads
- **Individual Delete**: Remove specific history items
- **Clear All**: Bulk delete all history
- **Export/Import**: Backup and restore history in JSON format
- **Advanced Filtering**: Filter by type, status, and search by title
- **Real-time Progress**: Live progress tracking with speedometer
- **ETA & Speed**: Estimated time and download/upload speed display

### ⚙️ Settings & Configuration
- **Dark Mode**: Toggle between light and dark themes
- **Default Settings**: Configure default quality and download modes
- **Platform Toggle**: Enable/disable specific platforms
- **Notifications**: Browser and sound notifications for completed jobs
- **Credentials Management**: Secure YouTube OAuth setup

### 🎨 Modern UI/UX
- **Tailwind CSS**: Modern, responsive design
- **Tab Navigation**: Organized interface with Download, Upload, History, and Settings tabs
- **Toast Notifications**: Non-intrusive status messages
- **Mobile Responsive**: Works perfectly on all device sizes
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- FFmpeg
- Python 3 (for yt-dlp)

### Automatic Installation

Run the automated installation script:

```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

This script will:
- Install FFmpeg
- Install Python and yt-dlp
- Install Node.js dependencies
- Create necessary directories
- Verify all installations

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-downloader-uploader
   ```

2. **Install system dependencies**

   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install -y ffmpeg python3 python3-pip
   sudo pip3 install yt-dlp
   ```

   **macOS:**
   ```bash
   brew install ffmpeg python
   pip3 install yt-dlp
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Create directories**
   ```bash
   mkdir -p downloads uploads temp logs exports batch data config
   ```

5. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your settings
   ```

6. **Start the application**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production
BASE_URL=https://yourdomain.com

# YouTube API (Optional - can be set via UI)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Security
SESSION_SECRET=your_random_session_secret

# File Paths
DOWNLOADS_PATH=./downloads
UPLOADS_PATH=./uploads
TEMP_PATH=./temp
```

### YouTube OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Add `https://yourdomain.com/api/auth/youtube/callback` to redirect URIs
7. Enter credentials in the Settings tab of the application

## 📖 Usage Guide

### Download Videos

1. **Single Download**:
   - Navigate to the Download tab
   - Enter video URL
   - Select quality and download mode
   - Click Preview to see video details (optional)
   - Click Download to start

2. **Batch Download**:
   - Enter multiple URLs (one per line)
   - Select quality and download mode
   - Click "Start Batch Download"

### Upload to YouTube

1. **Setup Authentication**:
   - Go to Settings tab
   - Enter YouTube OAuth credentials
   - Click "Authenticate with YouTube"
   - Complete OAuth flow

2. **Single Upload**:
   - Go to Upload tab
   - Select downloaded video or drag & drop files
   - Fill in title, description, tags
   - Set privacy and category
   - Click "Upload to YouTube"

3. **Batch Upload**:
   - Select multiple completed downloads
   - Set default privacy and tags
   - Click "Start Batch Upload"

### Manage History

- **View History**: Go to History tab to see all jobs
- **Filter**: Use type, status, and search filters
- **Export**: Click Export to download history as JSON
- **Import**: Click Import to restore from backup
- **Delete**: Use individual delete buttons or "Clear All"

## 🛠️ API Reference

### Download Endpoints

```http
POST /api/download
Content-Type: application/json

{
  "url": "https://example.com/video.mp4",
  "title": "Video Title",
  "quality": "720p",
  "downloadMode": "server"
}
```

```http
GET /api/download-status/:jobId
```

```http
GET /api/download-file/:jobId
```

### Upload Endpoints

```http
POST /api/upload-youtube
Content-Type: application/json

{
  "jobId": "download-job-id",
  "title": "YouTube Title",
  "description": "Video description",
  "tags": ["tag1", "tag2"],
  "privacy": "private",
  "category": "22"
}
```

```http
GET /api/upload-status/:jobId
```

### Utility Endpoints

```http
POST /api/preview
Content-Type: application/json

{
  "url": "https://example.com/video.mp4"
}
```

```http
POST /api/save-credentials
Content-Type: application/json

{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

```http
GET /api/auth/status
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: Prevents abuse
- **Input Sanitization**: Prevents injection attacks
- **CORS Protection**: Configurable origins
- **File Validation**: Secure file handling
- **OAuth2**: Secure YouTube authentication

## 🎯 Supported Platforms

- **YouTube**: Full support with metadata extraction
- **Vimeo**: Video downloads and info
- **Facebook**: Video downloads
- **Instagram**: Video downloads
- **Direct URLs**: MP4, M3U8, and other formats
- **Streaming**: HLS and DASH streams

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

2. **yt-dlp installation fails**
   ```bash
   pip3 install --user yt-dlp
   # or
   python3 -m pip install yt-dlp
   ```

3. **Permission errors**
   ```bash
   chmod 755 downloads uploads temp logs
   chown -R $USER:$USER downloads uploads temp logs
   ```

4. **YouTube authentication fails**
   - Check OAuth credentials
   - Verify redirect URI
   - Ensure YouTube Data API is enabled

5. **Download fails**
   - Check internet connection
   - Verify URL is accessible
   - Check available disk space

### Logs

Application logs are stored in the `logs/` directory:
- `app.log`: General application logs
- `error.log`: Error logs
- `combined.log`: All logs combined

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Video processing
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
- [Google APIs](https://developers.google.com/youtube) - YouTube integration
- [Tailwind CSS](https://tailwindcss.com/) - UI framework
- [Express.js](https://expressjs.com/) - Web framework

## 📞 Support

For support, please:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information
4. Include logs and error messages

---

**Made with ❤️ for the video content community** 