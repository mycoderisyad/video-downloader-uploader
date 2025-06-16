# 🎥 Video Downloader & Uploader

A powerful web application for downloading videos from multiple platforms and uploading them to YouTube with advanced features and modern UI.

## 🌟 Features

### 📥 Download System
- **Multi-Platform Support**: YouTube, Instagram, TikTok, Facebook, Twitter, and more
- **Quality Selection**: Choose from best, 1080p, 720p, 480p, 360p
- **Download Modes**: Server download or direct download
- **Batch Download**: Download multiple videos simultaneously
- **Real-time Progress**: Live progress tracking with speed and ETA

### 📤 Upload System
- **Upload via Link**: Direct download and upload to YouTube
- **Upload from Downloaded**: Upload previously downloaded videos
- **Upload from Local Files**: Upload user's local video files
- **Multi-mode Interface**: Single card with mode switching
- **YouTube Integration**: Full OAuth2 authentication
- **Progress Tracking**: Two-phase progress for direct uploads

### 🔐 Authentication & Security
- **YouTube OAuth2**: Secure authentication flow
- **Session Management**: Per-user token storage
- **Local Credentials**: Secure local credential storage
- **Auto Token Refresh**: Automatic token renewal
- **Security Headers**: CSP, CORS, and other security measures

### 📊 Management & Monitoring
- **Job History**: Complete download/upload history
- **Real-time Status**: Live job status tracking
- **Export/Import**: History data management
- **Auto Cleanup**: Automatic file and job cleanup
- **Error Handling**: Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- yt-dlp installed globally
- YouTube API credentials (for upload features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mycoderisyad/video-downloader-uploader.git
cd video-downloader-uploader
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Run the application**
```bash
npm start
# or
./start.sh
```

5. **Access the application**
- Local: http://127.0.0.1:3031
- Production: https://prafunschool.web.id

## 🔄 Application Workflow

### 📥 Download Workflow

```mermaid
graph TD
    A[User enters video URL] --> B{Validate URL}
    B -->|Invalid| C[Show error message]
    B -->|Valid| D[Detect platform]
    D --> E[Create download job]
    E --> F[Start yt-dlp process]
    F --> G[Monitor progress]
    G --> H{Download complete?}
    H -->|No| I[Update progress]
    I --> G
    H -->|Yes| J[Save to downloads folder]
    J --> K[Update job status to completed]
    K --> L[Show download link or auto-download]
```

### 📤 Upload Workflow

#### Upload via Link Flow
```mermaid
graph TD
    A[User enters video URL + metadata] --> B{Check YouTube auth}
    B -->|Not authenticated| C[Redirect to OAuth]
    B -->|Authenticated| D[Create upload job]
    D --> E[Phase 1: Download video]
    E --> F[Monitor download progress 0-50%]
    F --> G{Download complete?}
    G -->|No| F
    G -->|Yes| H[Phase 2: Upload to YouTube]
    H --> I[Monitor upload progress 50-100%]
    I --> J{Upload complete?}
    J -->|No| I
    J -->|Yes| K[Get YouTube video ID]
    K --> L[Show 'View on YouTube' button]
    L --> M[Auto cleanup temp files]
```

#### Upload from Downloaded Flow
```mermaid
graph TD
    A[User selects downloaded video] --> B{Check YouTube auth}
    B -->|Not authenticated| C[Redirect to OAuth]
    B -->|Authenticated| D[Validate download job]
    D --> E{File exists?}
    E -->|No| F[Show error]
    E -->|Yes| G[Create upload job]
    G --> H[Start YouTube upload]
    H --> I[Monitor progress 0-100%]
    I --> J{Upload complete?}
    J -->|No| I
    J -->|Yes| K[Get YouTube video ID]
    K --> L[Show 'View on YouTube' button]
```

### 🔐 Authentication Flow

```mermaid
graph TD
    A[User clicks 'Connect to YouTube'] --> B[Check saved credentials]
    B --> C{Credentials exist?}
    C -->|No| D[Show credentials form]
    D --> E[User enters Client ID/Secret]
    E --> F[Save credentials locally]
    F --> G[Generate OAuth URL]
    C -->|Yes| G
    G --> H[Open OAuth popup]
    H --> I[User grants permissions]
    I --> J[Receive authorization code]
    J --> K[Exchange code for tokens]
    K --> L[Store tokens in session]
    L --> M[Update UI to connected state]
    M --> N[Enable upload features]
```

## 🏗️ Architecture

### Backend Structure
```
├── server.js                 # Main server file
├── controllers/
│   ├── videoController.js    # Download logic
│   └── youtubeController.js  # Upload & auth logic
├── utils/
│   └── logger.js            # Logging utility
├── public/                  # Frontend files
├── downloads/               # Downloaded videos
├── uploads/                 # Uploaded files
├── temp/                    # Temporary files
└── logs/                    # Application logs
```

### Frontend Structure
```
public/
├── index.html              # Main HTML file
├── app.js                  # Main JavaScript logic
├── api-docs.html          # API documentation
└── assets/                # Static assets
```

### Key Components

#### 🎯 Core Services
- **Video Controller**: Handles download operations
- **YouTube Controller**: Manages upload and authentication
- **Logger**: Centralized logging system
- **Job Manager**: Tracks and manages all operations

#### 🔄 Data Flow
1. **Frontend** sends requests to REST API
2. **Controllers** process requests and manage jobs
3. **External Tools** (yt-dlp) handle video processing
4. **Storage** manages files and job data
5. **Real-time Updates** via polling mechanism

## 📡 API Documentation

Complete API documentation is available at `/api-docs` when the server is running.

### Key Endpoints

#### Download
- `POST /api/download` - Start video download
- `GET /api/download-status/:jobId` - Get download status

#### Upload
- `POST /api/upload-via-link` - Download and upload to YouTube
- `POST /api/upload-youtube` - Upload downloaded video
- `GET /api/upload-status/:jobId` - Get upload status

#### Authentication
- `GET /api/auth/youtube` - Initiate OAuth flow
- `POST /api/auth/status` - Check auth status
- `POST /api/auth/disconnect` - Disconnect from YouTube

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3031
NODE_ENV=production

# YouTube API (Optional - can be set via UI)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/auth/youtube/callback
```

### YouTube API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://yourdomain.com/api/auth/youtube/callback`
6. Enter credentials in the app's Settings tab

## 🧪 Testing

### Automated Testing
Run comprehensive tests:
```bash
./test-all-features.sh
```

### Manual Testing
1. **Download Test**: Try downloading from different platforms
2. **Upload Test**: Test all three upload modes
3. **Auth Test**: Test YouTube authentication flow
4. **Error Test**: Test error handling with invalid inputs

## 🚀 Deployment

### Production Deployment
```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker Deployment
```bash
# Build image
docker build -t video-downloader .

# Run container
docker run -d -p 3031:3031 video-downloader
```

### Manual Deployment
```bash
# Install dependencies
npm install --production

# Start server
npm start
```

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 status                 # Check process status
pm2 logs video-downloader  # View logs
pm2 monit                  # Real-time monitoring
```

### Health Checks
- Server health: `GET /`
- API health: `GET /api/auth/status`

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
node server.js
```

### Code Structure
- **MVC Pattern**: Separation of concerns
- **RESTful API**: Standard HTTP methods
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging with Winston
- **Security**: CORS, CSP, and input validation

## 🔍 Troubleshooting

### Common Issues

#### Download Issues
- **yt-dlp not found**: Install yt-dlp globally
- **Unsupported URL**: Check platform support
- **Network errors**: Check internet connection

#### Upload Issues
- **Authentication failed**: Check YouTube credentials
- **Quota exceeded**: YouTube API has daily limits
- **File not found**: Ensure download completed successfully

#### Server Issues
- **Port in use**: Change PORT in .env
- **Permission denied**: Check file permissions
- **Memory issues**: Monitor with `pm2 monit`

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start
```

## 📈 Performance

### Optimization Features
- **Concurrent Downloads**: Multiple simultaneous downloads
- **Progress Streaming**: Real-time progress updates
- **Memory Management**: Automatic cleanup of temporary files
- **Caching**: Efficient job status caching

### Resource Usage
- **Memory**: ~20-50MB base usage
- **CPU**: Varies with concurrent jobs
- **Storage**: Temporary files auto-cleaned
- **Network**: Depends on video sizes

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video downloading
- [Google APIs](https://developers.google.com/youtube) - YouTube integration
- [Express.js](https://expressjs.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - UI styling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mycoderisyad/video-downloader-uploader/issues)
- **Documentation**: Available at `/api-docs`
- **Testing**: Run `./test-all-features.sh`

---

**Made with ❤️ for seamless video downloading and uploading** 