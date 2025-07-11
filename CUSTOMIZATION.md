# Customization Guide

This guide explains how to customize the Video Downloader & Uploader for your specific needs.

## Quick Setup

The easiest way to configure the application for your domain:

```bash
chmod +x setup.sh
./setup.sh
```

This interactive script will guide you through:
- Domain configuration (localhost or custom domain)
- Port configuration
- HTTPS/HTTP settings
- YouTube API credentials
- CORS settings

## Manual Configuration

### 1. Domain Configuration

The application automatically detects your domain and configures redirect URIs accordingly. However, you can manually configure:

**Environment Variables:**
```bash
# .env file
DOMAIN=yourdomain.com
PORT=3031
CORS_ORIGINS=https://yourdomain.com,http://localhost:3031,http://127.0.0.1:3031
```

**For HTTPS:**
```bash
YOUTUBE_REDIRECT_URI=https://yourdomain.com:3031/api/auth/youtube/callback
```

**For HTTP (development):**
```bash
YOUTUBE_REDIRECT_URI=http://localhost:3031/api/auth/youtube/callback
```

### 2. YouTube API Configuration

#### Option A: Environment Variables
```bash
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/auth/youtube/callback
```

#### Option B: Settings UI (Recommended)
1. Leave environment variables empty
2. Open the application in browser
3. Go to Settings tab
4. Enter credentials in the form
5. Credentials are stored locally and securely

### 3. CORS Configuration

Configure allowed origins for your domain:

```bash
# Single domain
CORS_ORIGINS=https://yourdomain.com

# Multiple domains
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:3031
```

### 4. Port Configuration

Change the default port if needed:

```bash
PORT=8080
```

Update your redirect URI accordingly:
```bash
YOUTUBE_REDIRECT_URI=https://yourdomain.com:8080/api/auth/youtube/callback
```

## Deployment Options

### 1. Traditional Deployment

```bash
# Configure environment
cp env.example .env
# Edit .env with your settings

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.js
```

### 2. Docker Deployment

```bash
# Build image
docker build -t video-downloader .

# Run with environment file
docker run -d --env-file .env -p 3031:3031 video-downloader
```

### 3. Docker Compose

```bash
# Configure environment in .env file
# Then run:
docker-compose up -d
```

## Google Cloud Console Setup

### 1. Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable YouTube Data API v3

### 2. OAuth 2.0 Setup
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/youtube/callback`
   - `http://localhost:3031/api/auth/youtube/callback` (for testing)

### 3. OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill required information:
   - App name
   - User support email
   - Developer contact information
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
5. Add test users (your email addresses)

## Advanced Configuration

### 1. Custom Branding

**Title and Description:**
Edit `public/index.html`:
```html
<title>Your Custom Video Downloader</title>
<h1>Your Custom Video Downloader & Uploader</h1>
```

**Colors and Styling:**
The app uses Tailwind CSS. You can customize colors in the CSS classes throughout the HTML.

### 2. Rate Limiting

```bash
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window
```

### 3. File Storage

```bash
MAX_FILE_SIZE=2GB
CLEANUP_INTERVAL=24h
```

### 4. Logging

```bash
LOG_LEVEL=info  # error, warn, info, debug
NODE_ENV=production
```

## Security Considerations

### 1. HTTPS in Production
Always use HTTPS in production:
```bash
# Use a reverse proxy like nginx with SSL
# Or use cloud services with built-in SSL
```

### 2. Credential Storage
- **Local Storage**: Credentials stored in browser (recommended for self-hosted)
- **Environment Variables**: For shared deployments
- **Never commit credentials to version control**

### 3. CORS Settings
Be specific with CORS origins in production:
```bash
# Don't use wildcards in production
CORS_ORIGINS=https://yourdomain.com
```

## Platform-Specific Configuration

### 1. Additional Downloaders

The app supports multiple downloaders. You can configure preferences:
- `yt-dlp` (default, recommended)
- `gallery-dl` (good for social media)
- `youtube-dl-exec` (modern wrapper)
- `you-get` (alternative)

### 2. Platform Support

Current supported platforms:
- YouTube
- Instagram  
- TikTok
- Facebook
- Vimeo
- Twitter/X
- Direct video URLs (.mp4, .m3u8, etc.)

## Troubleshooting

### 1. Common Issues

**CORS Errors:**
- Add your domain to `CORS_ORIGINS`
- Check protocol (http vs https)

**YouTube Auth Errors:**
- Verify redirect URI matches exactly
- Check client ID/secret
- Ensure API is enabled

**Download Errors:**
- Install yt-dlp: `pip3 install yt-dlp`
- Update yt-dlp: `pip3 install --upgrade yt-dlp`

### 2. Debug Mode

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## Migration from Previous Versions

If migrating from a hardcoded domain version:

1. **Backup your data:**
   ```bash
   cp -r downloads downloads_backup
   cp -r data data_backup
   ```

2. **Update environment:**
   ```bash
   # Update to latest version
   ./update.sh
   # Or run setup again for reconfiguration
   ./setup.sh
   ```

3. **Test authentication:**
   - Clear browser data for the site
   - Re-authenticate with YouTube
   - Test upload functionality

## Support

- **Issues**: Report issues on GitHub
- **Documentation**: Check README.md
- **Community**: Join discussions for help 