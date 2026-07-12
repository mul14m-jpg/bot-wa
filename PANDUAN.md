# 📖 PANDUAN DEPLOY BOT XSRMUL

## 🚂 RAILWAY (dari screenshot yang dikirim)

### Langkah deploy ke Railway:

1. **Upload ke GitHub dulu**
   - Buat repo baru di github.com
   - Upload semua file bot ini ke repo tersebut

2. **Buka Railway** → railway.app
   - Klik **New Project**
   - Pilih **Deploy from GitHub repo**
   - Pilih repo bot kamu

3. **Setting Environment Variable di Railway**
   - Masuk ke project → tab **Variables**
   - Tambahkan: `PORT` = `3000` (Railway biasanya otomatis)

4. **Jalankan bot & ambil kode pairing**
   - Buka tab **Deploy** → lihat log
   - Tunggu muncul kode pairing 8 digit (format XXXX-XXXX)
   - Buka WhatsApp → Setelan → Perangkat Tertaut → Tautkan Perangkat
   - Masukkan kode pairing

5. **Setelah berhasil login**
   - Log akan menampilkan: ✅ [ONLINE] BOT PREMIUM XSRMUL berhasil terhubung
   - Bot siap digunakan!

---

## 🦖 PTERODACTYL PANEL

### Langkah setup di Pterodactyl:

1. **Buat server baru** di panel Pterodactyl
   - Pilih egg: **Node.js** (versi 18 atau 20)
   - Startup Command: `node index.js`

2. **Upload file bot**
   - Masuk ke File Manager di panel
   - Upload semua file bot ke direktori utama
   - Atau gunakan Git: `git clone [repo_kamu]`

3. **Install dependencies**
   - Masuk ke **Console** di panel
   - Jalankan: `npm install`

4. **Jalankan bot**
   - Klik tombol **Start** di panel
   - Lihat console → tunggu kode pairing muncul
   - Masukkan kode di WhatsApp

5. **Port penting**
   - Set environment variable `PORT` sesuai port yang dialokasikan panel
   - Atau biarkan default (3000)

---

## 💻 VPS / SERVER LINUX

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install ffmpeg (wajib untuk fitur sticker)
sudo apt install ffmpeg -y

# 3. Install dependencies bot
npm install

# 4. Jalankan bot (sementara)
node index.js

# 5. Jalankan bot secara permanen dengan PM2
npm install -g pm2
pm2 start index.js --name "bot-xsrmul"
pm2 save
pm2 startup
```

---

## 📱 TERMUX (Android)

```bash
# 1. Install Node.js & ffmpeg
pkg update && pkg upgrade
pkg install nodejs ffmpeg git -y

# 2. Masuk ke folder bot
cd bot-xsrmulz

# 3. Install dependencies
npm install

# 4. Jalankan bot
npm start
```

---

## ⚠️ SOLUSI MASALAH UMUM

| Masalah | Solusi |
|---------|--------|
| Reconnect loop terus-menerus | Hapus folder `auth_session` → restart |
| Kode pairing tidak muncul | Pastikan nomor di settings.js sudah benar (tanpa +62) |
| Sticker gagal dibuat | Install ffmpeg: `apt install ffmpeg` |
| Bot tiba-tiba mati di Railway | Cek tab Deploy → lihat error log |
| "Sesi rusak" | Hapus folder `auth_session` → restart |

---

## 📞 PERINTAH BOT

Setelah bot online, ketik di WhatsApp:
- `.menu` → lihat semua perintah
- `.help` → panduan cara pakai
- `.help [perintah]` → panduan spesifik, contoh: `.help sticker`
