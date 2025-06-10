# Video Downloader & YouTube Uploader

Aplikasi web modern untuk mendownload video dari berbagai sumber (termasuk format .m3u8) dan mengupload otomatis ke YouTube. Dibangun dengan teknologi terbaru 2025 dan dirancang untuk berjalan di domain `prafunschool.web.id`.

## 🚀 Fitur Utama

- ✅ Download video dari berbagai format (M3U8, MP4, dll)
- ✅ Upload otomatis ke YouTube dengan OAuth2
- ✅ Real-time progress tracking
- ✅ Support multiple video qualities
- ✅ Modern dan responsive UI
- ✅ Security headers dan rate limiting
- ✅ Logging dan error handling yang komprehensif
- ✅ Auto cleanup untuk file lama

## 🛠️ Teknologi yang Digunakan

### Backend
- **Node.js** v18+ 
- **Express.js** v4.19.2 - Web framework
- **FFmpeg** - Video processing
- **Google APIs** v131.0.0 - YouTube integration
- **Winston** v3.11.0 - Logging
- **Helmet** v7.1.0 - Security
- **Axios** v1.6.7 - HTTP client

### Frontend
- **Bootstrap** v5.3.2 - UI framework
- **Vanilla JavaScript** - No framework dependencies
- **Bootstrap Icons** v1.11.2 - Icon set
- **Inter Font** - Typography

## 📋 Prerequisites

1. **Node.js** v18 atau lebih baru
2. **FFmpeg** terinstall di sistem
3. **Google Cloud Console** account untuk YouTube API
4. Domain `prafunschool.web.id` (atau sesuaikan konfigurasi)

## 🔧 Instalasi

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install FFmpeg (Ubuntu/Debian)
sudo apt update
sudo apt install ffmpeg

# Atau untuk CentOS/RHEL
sudo yum install ffmpeg
```

### 2. Setup Environment

```bash
# Copy file environment example
cp env.example .env

# Edit file .env dengan konfigurasi Anda
nano .env
```

### 3. Konfigurasi YouTube API

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru atau pilih project yang ada
3. Enable **YouTube Data API v3**
4. Buat **OAuth 2.0 credentials**:
   - Application type: Web application
   - Authorized redirect URIs: `https://prafunschool.web.id/api/auth/youtube/callback`
5. Copy **Client ID** dan **Client Secret** ke file `.env`

### 4. Struktur Direktori

Aplikasi akan otomatis membuat direktori berikut:

```
├── downloads/     # File video yang didownload
├── uploads/       # File sementara untuk upload
├── temp/          # File temporary
├── logs/          # Log files
└── config/        # Konfigurasi dan tokens
```

## 🚀 Menjalankan Aplikasi

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Aplikasi akan berjalan di:
- **Local**: `http://localhost:3000`
- **Production**: `https://prafunschool.web.id:3000`

## 📖 Cara Penggunaan

### 1. Download Video

1. Masukkan URL video (mendukung .m3u8, .mp4, dll)
2. Pilih kualitas video (optional)
3. Masukkan judul video (optional)
4. Klik "Download Video"
5. Monitor progress di bagian progress tracker

### 2. Upload ke YouTube

1. Pastikan sudah ada video yang berhasil didownload
2. Klik "Autentikasi dengan YouTube" (hanya sekali)
3. Pilih video dari dropdown
4. Isi metadata YouTube:
   - Judul video
   - Deskripsi
   - Tags
   - Privacy setting
5. Klik "Upload ke YouTube"
6. Monitor progress dan dapatkan link YouTube

### 3. Autentikasi YouTube

Untuk upload ke YouTube, diperlukan autentikasi OAuth2:

1. Klik tombol "Autentikasi dengan YouTube"
2. Login dengan akun Google Anda
3. Berikan izin akses ke YouTube
4. Setelah berhasil, Anda bisa mengupload video

## ⚙️ Konfigurasi

### File Environment (.env)

```env
# Server
PORT=3000
NODE_ENV=production

# YouTube API
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://prafunschool.web.id/api/auth/youtube/callback

# Logging
LOG_LEVEL=info
```

### Konfigurasi FFmpeg

Aplikasi menggunakan FFmpeg untuk:
- Download video M3U8
- Konversi format video
- Optimasi kualitas video

Path FFmpeg akan otomatis dideteksi, atau bisa dikonfigurasi manual di environment.

## 📊 API Endpoints

### Download Endpoints
- `POST /api/download` - Start video download
- `GET /api/download-status/:jobId` - Get download status
- `DELETE /api/cleanup/:jobId` - Cleanup downloaded files

### YouTube Endpoints
- `GET /api/auth/youtube` - Initiate OAuth flow
- `GET /api/auth/youtube/callback` - OAuth callback
- `POST /api/upload-youtube` - Upload video to YouTube
- `GET /api/upload-status/:jobId` - Get upload status

## 🔒 Keamanan

Aplikasi dilengkapi dengan:

- **Helmet.js** - Security headers
- **Rate Limiting** - Mencegah abuse
- **CORS** - Cross-origin protection
- **Input validation** - Sanitasi input
- **File cleanup** - Auto delete file lama
- **Secure token storage** - OAuth token management

## 📝 Logging

Logs disimpan di direktori `logs/`:
- `error.log` - Error logs
- `combined.log` - All logs
- Console output (development mode)

## 🐛 Troubleshooting

### FFmpeg Error
```bash
# Pastikan FFmpeg terinstall
ffmpeg -version

# Jika error, install ulang
sudo apt reinstall ffmpeg
```

### YouTube API Error
- Periksa quota API di Google Cloud Console
- Pastikan credentials benar di `.env`
- Cek redirect URI sesuai konfigurasi

### Permission Error
```bash
# Berikan permission untuk direktori
chmod 755 downloads uploads temp logs config
```

### Port Already in Use
```bash
# Ganti port di .env atau kill process
sudo lsof -ti:3000 | xargs kill -9
```

## 📞 Support

Untuk bantuan dan support:
- Email: support@prafunschool.web.id
- Website: https://prafunschool.web.id

## 📄 License

MIT License - silakan gunakan untuk proyek komersial maupun non-komersial.

## 🔄 Updates

Aplikasi menggunakan dependencies terbaru 2025:
- Semua package up-to-date
- Security patches terkini
- Performance optimizations
- Modern JavaScript features

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/mycoderisyad/video-downloader-uploader.git
cd video-downloader-uploader

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your credentials
nano .env

# Run setup script
./update-oauth.sh

# Start application
./start-app.sh
```

## 📁 Project Structure

```
├── controllers/           # Business logic
│   ├── videoController.js # Video download handling
│   └── youtubeController.js # YouTube upload handling
├── utils/                # Utilities
│   └── logger.js         # Winston logging
├── public/               # Frontend files
│   ├── index.html        # Main UI
│   └── app.js           # Frontend JavaScript
├── package.json          # Dependencies
├── server.js            # Main server
├── .gitignore           # Git ignore rules
├── start-app.sh         # Start script
├── stop-app.sh          # Stop script
└── update-oauth.sh      # OAuth setup script
```

## 🔒 Security

- Environment variables in `.env` (not committed)
- Rate limiting and CORS protection
- Secure file handling
- OAuth 2.0 for YouTube API
- SSL/HTTPS support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Dibuat dengan ❤️ untuk prafunschool.web.id** 