# Setup Google OAuth untuk YouTube Upload

## Masalah yang Terjadi
- **Error 403: access_denied** - Aplikasi belum diverifikasi oleh Google
- **App in testing mode** - Hanya developer yang bisa akses

## Solusi Step-by-Step

### 1. Google Cloud Console Setup

1. **Buka Google Cloud Console**
   - https://console.cloud.google.com

2. **Buat/Pilih Project**
   - Nama: "Video Downloader Tool"
   - Project ID: `video-downloader-[random]`

3. **Enable YouTube Data API v3**
   ```
   APIs & Services > Library > YouTube Data API v3 > Enable
   ```

4. **Buat OAuth 2.0 Credentials**
   ```
   APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
   ```

5. **Application Type: Web Application**
   - Name: "Video Downloader"
   - Authorized redirect URIs:
     - `http://prafunschool.web.id/api/auth/youtube/callback`
     - `http://127.0.0.1:3000/api/auth/youtube/callback`

### 2. OAuth Consent Screen

1. **Configure Consent Screen**
   ```
   APIs & Services > OAuth consent screen
   ```

2. **User Type: External**

3. **App Information**
   - App name: "Video Downloader & YouTube Uploader"
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com

4. **Scopes**
   - Add these scopes:
   ```
   https://www.googleapis.com/auth/youtube.upload
   https://www.googleapis.com/auth/youtube
   ```

5. **Test Users** (Untuk Testing Mode)
   - Add your email: excelraf@gmail.com
   - Add other test users if needed

### 3. Update Environment Variables

Edit file `.env`:
```env
YOUTUBE_CLIENT_ID=your_actual_client_id_here
YOUTUBE_CLIENT_SECRET=your_actual_client_secret_here
YOUTUBE_REDIRECT_URI=http://prafunschool.web.id/api/auth/youtube/callback
```

### 4. Testing Mode vs Production

**Testing Mode (Current)**
- Hanya test users yang bisa akses
- Tidak perlu verifikasi Google
- Maksimal 100 users

**Production Mode**
- Perlu submit untuk verifikasi Google
- Process verifikasi 1-2 minggu
- Akses untuk semua users

### 5. Untuk Sementara (Testing Mode)

1. **Add Test Users**
   - Google Cloud Console > OAuth consent screen > Test users
   - Add: excelraf@gmail.com

2. **Use Test Account**
   - Login dengan akun yang sudah ditambahkan sebagai test user

### 6. Alternative Solusi Cepat

Jika ingin bypass OAuth untuk testing:

1. **Use Direct API Key** (Read-only)
2. **Service Account** (Server-to-server)
3. **Personal Access Token**

## Commands untuk Update

```bash
# Edit environment
nano .env

# Restart aplikasi
./stop-app.sh
./start-app.sh

# Test akses
curl http://prafunschool.web.id/api/auth/youtube
```

## Next Steps

1. ✅ Setup OAuth credentials yang benar
2. ✅ Add test users ke Google Console  
3. ✅ Update .env file
4. ⏳ Submit for verification (nanti)
5. ⏳ Setup SSL/HTTPS (opsional) 