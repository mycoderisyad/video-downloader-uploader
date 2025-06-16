#!/bin/bash

echo "🔐 YouTube Credentials Security Setup"
echo "===================================="
echo ""
echo "Pilih metode penyimpanan credentials:"
echo ""
echo "1. 🏠 Local Storage Only (Recommended)"
echo "   ✅ Paling aman - credentials tidak di server"
echo "   ✅ Mudah setup - tidak butuh database"
echo "   ✅ Auth tetap persisten"
echo ""
echo "2. 🗄️  Database Storage"
echo "   📊 MongoDB - Untuk aplikasi kompleks"
echo "   ☁️  Supabase - Managed cloud database"
echo "   📁 SQLite - Simple file database"
echo ""

read -p "Pilih opsi (1 atau 2): " choice

case $choice in
    1)
        echo ""
        echo "🏠 Setting up Local Storage Only..."
        echo ""
        echo "✅ Local storage sudah aktif!"
        echo ""
        echo "📋 Cara menggunakan:"
        echo "1. Buka website di browser"
        echo "2. Masuk ke tab Settings"
        echo "3. Input Client ID dan Client Secret"
        echo "4. Klik 'Save Credentials'"
        echo "5. Credentials akan tersimpan di browser saja"
        echo ""
        echo "🔒 Keamanan:"
        echo "- Credentials hanya di browser user"
        echo "- Server tidak menyimpan credentials"
        echo "- Auth tetap aktif sampai user disconnect"
        echo ""
        echo "✨ Setup selesai! Tidak perlu konfigurasi tambahan."
        ;;
    2)
        echo ""
        echo "🗄️  Setting up Database Storage..."
        echo ""
        echo "Pilih database:"
        echo "1. MongoDB"
        echo "2. Supabase"
        echo "3. SQLite"
        echo ""
        read -p "Pilih database (1-3): " db_choice
        
        case $db_choice in
            1)
                echo ""
                echo "📊 Setting up MongoDB..."
                echo ""
                echo "📦 Installing MongoDB dependencies..."
                npm install mongodb mongoose
                
                echo ""
                echo "📝 Konfigurasi MongoDB:"
                echo "1. Install MongoDB server:"
                echo "   sudo apt update"
                echo "   sudo apt install mongodb"
                echo ""
                echo "2. Start MongoDB service:"
                echo "   sudo systemctl start mongodb"
                echo "   sudo systemctl enable mongodb"
                echo ""
                echo "3. Update .env file:"
                echo "   MONGODB_URI=mongodb://localhost:27017/video-downloader"
                echo "   ENCRYPTION_KEY=$(openssl rand -hex 32)"
                echo ""
                echo "4. Copy database-example.js ke controllers/credentialsDB.js"
                cp database-example.js controllers/credentialsDB.js
                echo ""
                echo "✅ MongoDB setup selesai!"
                ;;
            2)
                echo ""
                echo "☁️  Setting up Supabase..."
                echo ""
                echo "📦 Installing Supabase dependencies..."
                npm install @supabase/supabase-js
                
                echo ""
                echo "📝 Konfigurasi Supabase:"
                echo "1. Buat project di: https://supabase.com"
                echo "2. Dapatkan URL dan anon key dari Settings > API"
                echo "3. Update .env file:"
                echo "   SUPABASE_URL=https://your-project.supabase.co"
                echo "   SUPABASE_ANON_KEY=your-anon-key"
                echo "   ENCRYPTION_KEY=$(openssl rand -hex 32)"
                echo ""
                echo "4. Jalankan SQL di Supabase SQL Editor:"
                echo "   (Lihat supabase-example.js untuk SQL commands)"
                echo ""
                echo "5. Copy supabase-example.js ke controllers/credentialsDB.js"
                cp supabase-example.js controllers/credentialsDB.js
                echo ""
                echo "✅ Supabase setup selesai!"
                ;;
            3)
                echo ""
                echo "📁 Setting up SQLite..."
                echo ""
                echo "📦 Installing SQLite dependencies..."
                npm install sqlite3 better-sqlite3
                
                echo ""
                echo "📝 Konfigurasi SQLite:"
                echo "1. Update .env file:"
                echo "   DATABASE_PATH=./data/credentials.db"
                echo "   ENCRYPTION_KEY=$(openssl rand -hex 32)"
                echo ""
                echo "2. Buat folder data:"
                mkdir -p data
                echo ""
                echo "✅ SQLite setup selesai!"
                ;;
            *)
                echo "❌ Pilihan tidak valid"
                exit 1
                ;;
        esac
        
        echo ""
        echo "🔧 Untuk mengaktifkan database storage:"
        echo "1. Edit controllers/youtubeController.js"
        echo "2. Import dan gunakan credentialsDB"
        echo "3. Ganti localStorage logic dengan database calls"
        echo ""
        echo "📖 Lihat contoh implementasi di file example yang sudah dibuat"
        ;;
    *)
        echo "❌ Pilihan tidak valid"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup selesai!"
echo ""
echo "📱 Langkah selanjutnya:"
echo "1. Restart aplikasi: ./start.sh"
echo "2. Buka website dan test authentication"
echo "3. Pastikan credentials tersimpan dengan aman"
echo ""
echo "❓ Butuh bantuan? Lihat README.md bagian 'YouTube Credentials Security Options'" 