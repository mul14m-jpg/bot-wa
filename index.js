const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    isJidBroadcast,
    jidDecode,
    proto
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

const settings = require('./settings.js');

// =============================================
// DETEKSI TERMUX ANDROID OTOMATIS
// =============================================
const isTermux = process.env.PREFIX && process.env.PREFIX.includes('com.termux');
if (isTermux) {
    ffmpeg.setFfmpegPath(`${process.env.PREFIX}/bin/ffmpeg`);
    console.log('[TERMUX] ffmpeg path dikunci ke:', `${process.env.PREFIX}/bin/ffmpeg`);
}

// =============================================
// DATABASE HELP — panduan setiap perintah
// =============================================
const HELP_DATA = {
    sticker: {
        judul: '🖼️ STICKER MAKER',
        cara: [
            '1️⃣ *Cara 1 — Kirim gambar dengan caption:*',
            '   • Pilih foto dari galeri kamu',
            '   • Sebelum kirim, ketik *.sticker* di kolom caption',
            '   • Kirim → bot otomatis ubah jadi sticker',
            '',
            '2️⃣ *Cara 2 — Reply gambar yang sudah ada:*',
            '   • Tekan & tahan foto yang sudah terkirim',
            '   • Pilih "Balas" (Reply)',
            '   • Ketik *.sticker* lalu kirim',
            '',
            '⚠️ *Catatan:* Hanya mendukung format gambar (JPG/PNG). Bukan video/gif.'
        ].join('\n')
    },
    toimg: {
        judul: '🖼️ TOIMG — Sticker ke Gambar',
        cara: [
            '1️⃣ *Cara 1 — Kirim sticker dengan caption:*',
            '   • Kirim sticker dengan caption *.toimg*',
            '',
            '2️⃣ *Cara 2 — Reply sticker:*',
            '   • Tekan & tahan sticker → Balas → ketik *.toimg*',
            '',
            '✅ Bot akan mengubah sticker menjadi file gambar JPG.'
        ].join('\n')
    },
    tiktok: {
        judul: '📱 TIKTOK DOWNLOADER',
        cara: [
            '*Format perintah:*',
            '   *.tiktok [link video]*',
            '   *.tt [link video]*',
            '',
            '*Contoh:*',
            '   .tiktok https://vm.tiktok.com/ZMxxxxxxx/',
            '   .tt https://www.tiktok.com/@user/video/12345',
            '',
            '📋 *Cara ambil link TikTok:*',
            '   • Buka aplikasi TikTok',
            '   • Tap ikon Share (panah) pada video',
            '   • Pilih "Salin Link"',
            '   • Paste link setelah perintah .tiktok',
            '',
            '✅ Bot akan kirim video tanpa watermark.'
        ].join('\n')
    },
    instagram: {
        judul: '📸 INSTAGRAM DOWNLOADER',
        cara: [
            '*Format perintah:*',
            '   *.instagram [link postingan]*',
            '',
            '*Contoh:*',
            '   .instagram https://www.instagram.com/p/CxxxxXXXX/',
            '   .instagram https://www.instagram.com/reel/CxxxxXXXX/',
            '',
            '📋 *Cara ambil link Instagram:*',
            '   • Buka postingan/reel yang ingin didownload',
            '   • Tap titik tiga (⋮) → "Salin Tautan"',
            '   • Paste link setelah perintah .instagram',
            '',
            '✅ Mendukung: foto, video, reels, IGTV.'
        ].join('\n')
    },
    youtube: {
        judul: '▶️ YOUTUBE DOWNLOADER',
        cara: [
            '*Format perintah (download via link):*',
            '   *.youtube [link youtube]*',
            '',
            '*Format perintah (cari lagu):*',
            '   *.play [judul lagu/video]*',
            '',
            '*Contoh:*',
            '   .youtube https://youtu.be/dQw4w9WgXcQ',
            '   .play alan walker faded',
            '   .play dj slow remix terbaru',
            '',
            '📋 *Cara ambil link YouTube:*',
            '   • Buka video di YouTube',
            '   • Tap Share → "Salin Tautan"',
            '',
            '✅ Bot akan kirim file audio MP3.',
            '⏳ Proses bisa memakan waktu 15-60 detik.'
        ].join('\n')
    },
    pinterest: {
        judul: '📌 PINTEREST SEARCH',
        cara: [
            '*Format perintah:*',
            '   *.pinterest [kata kunci]*',
            '',
            '*Contoh:*',
            '   .pinterest anime wallpaper',
            '   .pinterest sunset aesthetic',
            '   .pinterest quotes motivasi',
            '   .pinterest logo keren',
            '',
            '✅ Bot akan mengirim gambar acak dari hasil pencarian Pinterest.'
        ].join('\n')
    },
    ai: {
        judul: '🤖 AI CHATGPT',
        cara: [
            '*Format perintah:*',
            '   *.ai [pertanyaan kamu]*',
            '',
            '*Contoh penggunaan:*',
            '   .ai siapa presiden Indonesia?',
            '   .ai jelaskan apa itu fotosintesis',
            '   .ai buatkan puisi tentang hujan',
            '   .ai apa bedanya HTTP dan HTTPS?',
            '   .ai terjemahkan "good morning" ke bahasa Jawa',
            '',
            '💡 *Tips:* Semakin detail pertanyaan kamu, semakin akurat jawabannya.',
            '',
            '🤖 *.ai2* — versi alternatif dengan model logika berbeda',
            '   .ai2 hitung 15% dari 2.500.000'
        ].join('\n')
    },
    gemini: {
        judul: '✨ GEMINI AI (Google)',
        cara: [
            '*Format perintah:*',
            '   *.gemini [pertanyaan kamu]*',
            '',
            '*Contoh:*',
            '   .gemini apa perbedaan AI dan machine learning?',
            '   .gemini buatkan essay tentang lingkungan hidup',
            '   .gemini rekomendasikan 5 film horror terbaik',
            '',
            '💡 Gemini cocok untuk pertanyaan panjang, esai, dan analisis mendalam.'
        ].join('\n')
    },
    brainly: {
        judul: '📚 BRAINLY — Jawaban Pelajaran',
        cara: [
            '*Format perintah:*',
            '   *.brainly [pertanyaan pelajaran]*',
            '',
            '*Contoh:*',
            '   .brainly apa rumus luas lingkaran?',
            '   .brainly sebutkan 5 sila pancasila',
            '   .brainly jelaskan proses terjadinya hujan',
            '   .brainly apa itu fotosintesis pada tumbuhan',
            '',
            '✅ Cocok untuk PR, tugas sekolah, dan pertanyaan akademik.'
        ].join('\n')
    },
    gimage: {
        judul: '🔍 GOOGLE IMAGE SEARCH',
        cara: [
            '*Format perintah:*',
            '   *.gimage [kata kunci]*',
            '',
            '*Contoh:*',
            '   .gimage kucing lucu',
            '   .gimage pemandangan bali',
            '   .gimage logo nike',
            '   .gimage anime girl aesthetic',
            '',
            '✅ Bot akan mengirim gambar acak dari hasil pencarian Google Images.'
        ].join('\n')
    },
    kbbi: {
        judul: '📖 KBBI — Kamus Besar Bahasa Indonesia',
        cara: [
            '*Format perintah:*',
            '   *.kbbi [satu kata]*',
            '',
            '*Contoh:*',
            '   .kbbi merdeka',
            '   .kbbi resiliensi',
            '   .kbbi gaduh',
            '   .kbbi improvisasi',
            '',
            '✅ Bot akan menampilkan definisi resmi dari KBBI.',
            '⚠️ Hanya satu kata per pencarian. Bukan untuk kalimat.'
        ].join('\n')
    },
    weather: {
        judul: '🌤️ CEK CUACA KOTA',
        cara: [
            '*Format perintah:*',
            '   *.weather [nama kota]*',
            '',
            '*Contoh:*',
            '   .weather Jakarta',
            '   .weather Surabaya',
            '   .weather Bali',
            '   .weather Bandung',
            '   .weather New York',
            '',
            '✅ Bot akan menampilkan:',
            '   • Suhu saat ini (°C)',
            '   • Kondisi cuaca (cerah/hujan/berawan)',
            '   • Kelembaban udara',
            '   • Kecepatan angin'
        ].join('\n')
    },
    tts: {
        judul: '🔊 TTS — Text to Speech',
        cara: [
            '*Format perintah:*',
            '   *.tts [teks yang mau diucapkan]*',
            '',
            '*Contoh:*',
            '   .tts halo selamat datang di bot premium',
            '   .tts saya akan selalu ada untukmu',
            '   .tts tolong kerjakan tugasmu sekarang',
            '',
            '✅ Bot akan mengirim pesan suara (voice note) dalam Bahasa Indonesia.',
            '💡 Tips: Gunakan kalimat pendek agar lebih jelas dan natural.'
        ].join('\n')
    },
    runtime: {
        judul: '⏱️ RUNTIME BOT',
        cara: [
            '*Format perintah:*',
            '   *.runtime*',
            '',
            '✅ Bot akan menampilkan sudah berapa lama bot ini berjalan sejak terakhir dihidupkan.',
            '',
            '*Informasi yang ditampilkan:*',
            '   • Hari berjalan',
            '   • Jam berjalan',
            '   • Menit berjalan',
            '   • Detik berjalan'
        ].join('\n')
    },
    speed: {
        judul: '⚡ SPEED TEST BOT',
        cara: [
            '*Format perintah:*',
            '   *.speed*',
            '',
            '✅ Bot akan mengukur kecepatan respons (latency) dalam milidetik.',
            '',
            '*Keterangan hasil:*',
            '   ✅ CEPAT  → < 500ms',
            '   ⚠️ NORMAL → 500ms - 1000ms',
            '   ❌ LAMBAT → > 1000ms'
        ].join('\n')
    },
    tourl: {
        judul: '🔗 TOURL — Upload Gambar ke Link',
        cara: [
            '*Format perintah:*',
            '   Kirim gambar dengan caption *.tourl*',
            '   ATAU reply gambar dengan *.tourl*',
            '',
            '*Cara pakai:*',
            '   1. Pilih gambar dari galeri',
            '   2. Ketik .tourl di caption, lalu kirim',
            '   ATAU',
            '   1. Balas (reply) gambar yang sudah ada',
            '   2. Ketik .tourl lalu kirim',
            '',
            '✅ Bot akan mengirim link URL publik dari gambar tersebut.',
            '💡 Link bisa dibagikan ke mana saja dan bisa dibuka di browser.'
        ].join('\n')
    },
    tebakgambar: {
        judul: '🎮 TEBAK GAMBAR',
        cara: [
            '*Format perintah:*',
            '   *.tebakgambar*',
            '',
            '*Cara bermain:*',
            '   1. Ketik .tebakgambar',
            '   2. Bot akan kirim sebuah gambar',
            '   3. Tebak gambar tersebut apa',
            '   4. Jawaban tersembunyi di caption (gunakan spoiler)',
            '',
            '✅ Cocok untuk hiburan di grup maupun chat pribadi.'
        ].join('\n')
    },
    gantengcek: {
        judul: '💪 GANTENG METER',
        cara: [
            '*Format perintah:*',
            '   *.gantengcek*',
            '',
            '*Cara pakai:*',
            '   Cukup ketik .gantengcek lalu kirim',
            '   Bot akan menghitung tingkat kegantengmu secara acak',
            '',
            '*Hasil:*',
            '   • 80-100% → 😍 Sangat Ganteng!',
            '   • 60-79%  → 😊 Lumayan Ganteng',
            '   • 40-59%  → 😐 Biasa Saja',
            '   • 0-39%   → 😅 Kurang Ganteng'
        ].join('\n')
    },
    couplecek: {
        judul: '💑 COUPLE METER',
        cara: [
            '*Format perintah:*',
            '   *.couplecek*',
            '',
            '*Cara pakai:*',
            '   Cukup ketik .couplecek lalu kirim',
            '   Bot akan mengukur kecocokan pasangan secara acak',
            '',
            '*Hasil:*',
            '   • 80-100% → 💑 Pasangan Sempurna!',
            '   • 60-79%  → 💕 Cocok Banget',
            '   • 40-59%  → 💛 Cukup Cocok',
            '   • 0-39%   → 💔 Kurang Cocok'
        ].join('\n')
    },
    quotes: {
        judul: '💬 QUOTES / KATA MUTIARA',
        cara: [
            '*Format perintah:*',
            '   *.quotes*',
            '',
            '*Cara pakai:*',
            '   Cukup ketik .quotes lalu kirim',
            '   Bot akan mengirim kutipan inspiratif secara acak',
            '',
            '✅ Setiap kali diketik, quote yang muncul berbeda-beda.'
        ].join('\n')
    },
    kick: {
        judul: '👢 KICK ANGGOTA GRUP',
        cara: [
            '*Format perintah:*',
            '   *.kick [@tag anggota]*',
            '',
            '*Cara pakai:*',
            '   1. Ketik .kick',
            '   2. Lalu tag/mention anggota yang ingin dikeluarkan',
            '   Contoh: .kick @08123456789',
            '',
            '⚠️ *Syarat:*',
            '   • Hanya bisa digunakan di dalam grup',
            '   • Bot harus menjadi admin grup',
            '   • Kamu harus admin grup'
        ].join('\n')
    },
    add: {
        judul: '➕ ADD ANGGOTA GRUP',
        cara: [
            '*Format perintah:*',
            '   *.add [nomor telepon]*',
            '',
            '*Contoh:*',
            '   .add 08123456789',
            '   .add 628123456789',
            '',
            '⚠️ *Syarat:*',
            '   • Hanya bisa digunakan di dalam grup',
            '   • Bot harus menjadi admin grup',
            '   • Nomor yang ditambahkan harus aktif di WhatsApp'
        ].join('\n')
    },
    group: {
        judul: '⚙️ PENGATURAN GRUP',
        cara: [
            '*Format perintah:*',
            '   *.group open*  — Buka grup (semua bisa chat)',
            '   *.group close* — Tutup grup (hanya admin yang bisa chat)',
            '',
            '*Cara pakai:*',
            '   Ketik .group open  → semua anggota bisa kirim pesan',
            '   Ketik .group close → hanya admin yang bisa kirim pesan',
            '',
            '⚠️ *Syarat:*',
            '   • Hanya bisa digunakan di dalam grup',
            '   • Bot harus menjadi admin grup'
        ].join('\n')
    },
    acc: {
        judul: '✅ ACC — Setujui Akses User',
        cara: [
            '*Format perintah (khusus Owner):*',
            '   *.acc [nomor telepon]*',
            '',
            '*Contoh:*',
            '   .acc 08123456789',
            '',
            '*Alur kerja:*',
            '   1. User tidak terdaftar mengetik *.request*',
            '   2. Notifikasi masuk ke Owner',
            '   3. Owner ketik *.acc [nomor]* untuk menyetujui',
            '   4. User mendapat notifikasi akses diterima',
            '',
            '⚠️ Hanya Owner yang bisa menggunakan perintah ini.'
        ].join('\n')
    },
    broadcast: {
        judul: '📢 BROADCAST PESAN',
        cara: [
            '*Format perintah (khusus Owner):*',
            '   *.broadcast [isi pesan]*',
            '',
            '*Contoh:*',
            '   .broadcast Halo semua! Bot akan maintenance pukul 22.00 WIB',
            '   .broadcast Update fitur baru sudah tersedia. Ketik .menu untuk melihat.',
            '',
            '✅ Pesan akan dikirim ke semua nomor yang terdaftar di whitelist.',
            '⚠️ Hanya Owner yang bisa menggunakan perintah ini.'
        ].join('\n')
    },
    request: {
        judul: '📩 REQUEST AKSES BOT',
        cara: [
            '*Format perintah:*',
            '   *.request*',
            '',
            '*Cara pakai:*',
            '   1. Jika kamu belum terdaftar, ketik *.request*',
            '   2. Bot akan otomatis mengirim notifikasi ke Owner',
            '   3. Tunggu Owner menyetujui permintaanmu',
            '   4. Setelah disetujui, kamu bisa menggunakan semua fitur bot',
            '',
            '✅ Perintah ini bisa digunakan oleh siapa saja, bahkan yang belum terdaftar.'
        ].join('\n')
    },
    remini: {
        judul: '✨ REMINI — Perjelas Foto Buram',
        cara: [
            '*Format perintah:*',
            '   Kirim foto buram dengan caption *.remini*',
            '   ATAU reply foto buram dengan *.remini*',
            '',
            '*Cara pakai:*',
            '   1. Pilih foto yang buram/kualitas rendah',
            '   2. Ketik .remini di caption lalu kirim',
            '   ATAU balas foto yang sudah ada dengan .remini',
            '',
            '✅ Bot menggunakan AI untuk memperjelas dan meningkatkan kualitas foto.',
            '⚠️ Fitur ini memerlukan aktivasi dari Owner terlebih dahulu.'
        ].join('\n')
    },
    removebg: {
        judul: '🖼️ REMOVEBG — Hapus Background Foto',
        cara: [
            '*Format perintah:*',
            '   Kirim foto dengan caption *.removebg*',
            '   ATAU reply foto dengan *.removebg*',
            '',
            '*Cara pakai:*',
            '   1. Pilih foto yang ingin dihapus backgroundnya',
            '   2. Ketik .removebg di caption lalu kirim',
            '   ATAU balas foto yang sudah ada dengan .removebg',
            '',
            '✅ Bot akan mengirim foto dengan background transparan (PNG).',
            '⚠️ Fitur ini memerlukan aktivasi API key dari Owner.'
        ].join('\n')
    }
};

// =============================================
// HELPER: Baca & Simpan user.json
// =============================================
const USER_FILE = path.join(__dirname, 'user.json');

function readUsers() {
    try {
        const raw = fs.readFileSync(USER_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [settings.ownerNumber];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// =============================================
// HELPER: Baca autoreply.json
// =============================================
const AUTOREPLY_FILE = path.join(__dirname, 'autoreply.json');

function readAutoreply() {
    try {
        const raw = fs.readFileSync(AUTOREPLY_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

// =============================================
// HELPER: Normalisasi nomor
// =============================================
function normalizeNumber(num) {
    return num.replace(/[^0-9]/g, '');
}

function toJid(num) {
    return normalizeNumber(num) + '@s.whatsapp.net';
}

// =============================================
// HELPER: Runtime bot
// =============================================
const startTime = Date.now();

function getRuntime() {
    const diff = Date.now() - startTime;
    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} hari, ${hours} jam, ${minutes} menit, ${seconds} detik`;
}

// =============================================
// HELPER: Download file dari URL ke buffer
// =============================================
async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

// =============================================
// HELPER: Gambar → Sticker WebP via ffmpeg
// =============================================
async function imageToWebpBuffer(imgBuffer) {
    return new Promise((resolve, reject) => {
        const tmpIn = path.join(__dirname, `_tmp_in_${Date.now()}.jpg`);
        const tmpOut = path.join(__dirname, `_tmp_out_${Date.now()}.webp`);
        fs.writeFileSync(tmpIn, imgBuffer);
        ffmpeg(tmpIn)
            .outputOptions([
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
                '-loop', '0',
                '-preset', 'default',
                '-an',
                '-vsync', '0'
            ])
            .toFormat('webp')
            .save(tmpOut)
            .on('end', () => {
                const buf = fs.readFileSync(tmpOut);
                try { fs.unlinkSync(tmpIn); } catch {}
                try { fs.unlinkSync(tmpOut); } catch {}
                resolve(buf);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(tmpIn); } catch {}
                try { fs.unlinkSync(tmpOut); } catch {}
                reject(err);
            });
    });
}

// =============================================
// HELPER: Ambil teks dari semua jenis pesan
// =============================================
function getMessageText(msg) {
    return (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        msg?.message?.documentMessage?.caption ||
        ''
    );
}

// =============================================
// HELPER: Format teks help
// =============================================
function formatHelp(key) {
    const data = HELP_DATA[key];
    if (!data) return null;
    return `╔════════════════════╗\n  ${data.judul}\n╚════════════════════╝\n\n${data.cara}`;
}

// =============================================
// CAPTION MENU
// =============================================
const menuCaption = `*WELCOME TO BOT XSRMUL* ⚔️🔥

╔════════════════════╗
        *OWNER*
╠════════════════════╝
│ ├ .broadcast
│ ├ .clear
│ ├ .block
│ ├ .unblock
│ ├ .listuser
│ ├ .acc [nomor]
│ ├ .tolak [nomor]
│
╔════════════════════╗
      *DOWNLOADER*
╠════════════════════╝
│ ├ .tiktok [link]
│ ├ .tt [link]
│ ├ .instagram [link]
│ ├ .youtube [link]
│ ├ .play [judul]
│ ├ .pinterest [query]
│
╔════════════════════╗
     *GROUP MANAGE*
╠════════════════════╝
│ ├ .kick [@tag]
│ ├ .add [nomor]
│ ├ .group [open/close]
│
╔════════════════════╗
        *MAKER*
╠════════════════════╝
│ ├ .sticker
│ ├ .toimg
│ ├ .tovideo
│ ├ .tomp3
│ ├ .tourl
│ ├ .remini
│ ├ .removebg
│
╔════════════════════╗
     *AI & TOOLS*
╠════════════════════╝
│ ├ .ai (ChatGPT)
│ ├ .ai2 (Logic Alternative)
│ ├ .gemini
│ ├ .brainly
│ ├ .gimage
│ ├ .kbbi [kata]
│ ├ .weather [kota]
│ ├ .tts [teks]
│ ├ .runtime
│ ├ .speed
│
╔════════════════════╗
         *FUN*
╠════════════════════╝
│ ├ .tebakgambar
│ ├ .gantengcek
│ ├ .couplecek
│ ├ .quotes
│
╚════════════════════╝
💡 Ketik *.help [perintah]* untuk cara penggunaan
Contoh: *.help sticker*  |  *.help ai*  |  *.help tiktok*
*STATUS: ACTIVE | SECURE*`;

// =============================================
// CAPTION HELP MASTER
// =============================================
const helpMasterCaption = `╔════════════════════╗
   📖 *PANDUAN PERINTAH BOT*
╚════════════════════╝

Ketik *.help [nama perintah]* untuk melihat cara penggunaan detail.

📥 *DOWNLOADER*
  • .help tiktok
  • .help instagram
  • .help youtube
  • .help pinterest

🖼️ *MAKER*
  • .help sticker
  • .help toimg
  • .help tourl
  • .help remini
  • .help removebg

🤖 *AI & TOOLS*
  • .help ai
  • .help gemini
  • .help brainly
  • .help gimage
  • .help kbbi
  • .help weather
  • .help tts
  • .help runtime
  • .help speed

🎮 *FUN*
  • .help tebakgambar
  • .help gantengcek
  • .help couplecek
  • .help quotes

👥 *GROUP*
  • .help kick
  • .help add
  • .help group

🔐 *AKSES & OWNER*
  • .help request
  • .help acc
  • .help broadcast`;

// =============================================
// MAIN KONEKSI
// =============================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['BOT-XSRMUL', 'Chrome', '112.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    });

    // Jika belum login → minta pairing code
    if (!conn.authState.creds.registered) {
        const phoneNumber = normalizeNumber(settings.botNumber);
        console.log('\n[PAIRING] Bot belum login. Menunggu 6 detik sebelum meminta kode pairing...');
        setTimeout(async () => {
            try {
                const code = await conn.requestPairingCode(phoneNumber);
                const formatted = code.match(/.{1,4}/g).join('-');
                console.log('\n╔══════════════════════════╗');
                console.log('║  KODE PAIRING WHATSAPP   ║');
                console.log('╠══════════════════════════╣');
                console.log(`║       ${formatted}        ║`);
                console.log('╚══════════════════════════╝');
                console.log('Buka WhatsApp → Setelan → Perangkat Tertaut → Tautkan Perangkat → Masukkan kode di atas.\n');
            } catch (err) {
                console.error('[PAIRING ERROR]', err.message);
            }
        }, 6000);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log('[KONEKSI] Terputus, alasan kode:', reason);
            if (reason === DisconnectReason.badSession) {
                console.log('[KONEKSI] Sesi rusak. Hapus folder auth_session dan restart.');
            } else if (
                reason === DisconnectReason.connectionClosed ||
                reason === DisconnectReason.connectionLost ||
                reason === DisconnectReason.connectionReplaced ||
                reason === DisconnectReason.timedOut
            ) {
                console.log('[KONEKSI] Mencoba reconnect...');
                startBot();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('[KONEKSI] Bot logout. Hapus auth_session dan restart.');
            } else {
                console.log('[KONEKSI] Alasan tidak dikenal, mencoba reconnect...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`\n✅ [ONLINE] ${settings.botName} berhasil terhubung ke WhatsApp!\n`);
        }
    });

    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;
            if (isJidBroadcast(msg.key.remoteJid)) continue;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const senderJid = isGroup ? msg.key.participant : from;
            const senderNum = normalizeNumber(
                (senderJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '')
            );

            const ownerNum = normalizeNumber(settings.ownerNumber);
            const isOwner = senderNum === ownerNum;

            const body = getMessageText(msg);
            const bodyLower = body.trim().toLowerCase();
            const parts = body.trim().split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            const q = args.join(' ');

            // Auto-reply (bukan dari perintah dot)
            if (!body.startsWith('.')) {
                const autoreplies = readAutoreply();
                for (const ar of autoreplies) {
                    if (bodyLower.includes(ar.trigger.toLowerCase())) {
                        await conn.sendMessage(from, { text: ar.reply }, { quoted: msg });
                    }
                }
                continue;
            }

            // =============================================
            // WHITELIST SECURITY
            // =============================================
            const users = readUsers();
            const isWhitelisted = users.includes(senderNum) || isOwner;

            if (!isWhitelisted && command !== '.request' && command !== '.help') {
                await conn.sendMessage(from, {
                    text: `⛔ *AKSES DITOLAK*\n\nNomor kamu belum terdaftar di whitelist bot ini.\n\n📩 Ketik *.request* untuk meminta akses ke Owner.\nSetelah disetujui, kamu bisa menggunakan semua fitur.`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .help
            // =============================================
            if (command === '.help') {
                if (!q) {
                    await conn.sendMessage(from, { text: helpMasterCaption }, { quoted: msg });
                    continue;
                }
                const key = q.toLowerCase().replace('.', '').trim();
                const aliasMap = {
                    'stiker': 'sticker',
                    'tt': 'tiktok',
                    'ig': 'instagram',
                    'play': 'youtube',
                    'tomp3': 'youtube',
                    'ai2': 'ai',
                    'listuser': 'acc',
                    'tolak': 'acc',
                    'block': 'broadcast',
                    'unblock': 'broadcast',
                    'clear': 'broadcast'
                };
                const resolvedKey = aliasMap[key] || key;
                const helpText = formatHelp(resolvedKey);
                if (helpText) {
                    await conn.sendMessage(from, { text: helpText }, { quoted: msg });
                } else {
                    await conn.sendMessage(from, {
                        text: `❓ Tidak ada panduan untuk perintah *${q}*.\n\nKetik *.help* untuk melihat daftar semua panduan yang tersedia.`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .request
            // =============================================
            if (command === '.request') {
                const ownerJid = toJid(settings.ownerNumber);
                await conn.sendMessage(ownerJid, {
                    text: `📩 *PERMINTAAN AKSES BOT*\n\nDari: @${senderNum}\nJID: ${senderJid}\n\n✅ Setujui: *.acc ${senderNum}*\n❌ Tolak: *.tolak ${senderNum}*`,
                    mentions: [senderJid]
                });
                await conn.sendMessage(from, {
                    text: `✅ *Permintaan Terkirim!*\n\nPermintaan akses kamu sudah dikirim ke Owner.\nHarap tunggu persetujuan. Kamu akan mendapat notifikasi setelah disetujui.\n\n💡 Ketik *.help request* untuk info lebih lanjut.`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // GUARD: Perintah khusus Owner
            // =============================================
            const ownerOnlyCommands = ['.acc', '.tolak', '.broadcast', '.clear', '.block', '.unblock', '.listuser'];
            if (ownerOnlyCommands.includes(command) && !isOwner) {
                await conn.sendMessage(from, {
                    text: `🔒 *AKSES DITOLAK*\n\nPerintah *${command}* hanya bisa digunakan oleh *Owner Bot*.`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .acc [nomor]
            // =============================================
            if (command === '.acc') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *Format salah!*\n\n${formatHelp('acc')}`
                    }, { quoted: msg });
                    continue;
                }
                const targetNum = normalizeNumber(q);
                const users = readUsers();
                if (users.includes(targetNum)) {
                    await conn.sendMessage(from, { text: `ℹ️ Nomor *${targetNum}* sudah ada di whitelist.` }, { quoted: msg });
                    continue;
                }
                users.push(targetNum);
                saveUsers(users);
                await conn.sendMessage(from, { text: `✅ Nomor *${targetNum}* berhasil ditambahkan ke whitelist!` }, { quoted: msg });
                try {
                    await conn.sendMessage(toJid(targetNum), {
                        text: `🎉 *Selamat! Akses bot kamu DISETUJUI!*\n\nKetik *.menu* untuk melihat daftar perintah.\nKetik *.help* untuk panduan cara penggunaan.`
                    });
                } catch {}
                continue;
            }

            // =============================================
            // HANDLER .tolak [nomor]
            // =============================================
            if (command === '.tolak') {
                if (!q) {
                    await conn.sendMessage(from, { text: `⚠️ Gunakan: *.tolak [nomor]*\nContoh: .tolak 08123456789` }, { quoted: msg });
                    continue;
                }
                const targetNum = normalizeNumber(q);
                try {
                    await conn.sendMessage(toJid(targetNum), {
                        text: `❌ Maaf, permintaan akses bot kamu *DITOLAK* oleh Owner.`
                    });
                } catch {}
                await conn.sendMessage(from, { text: `✅ Permintaan dari *${targetNum}* telah ditolak.` }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .listuser
            // =============================================
            if (command === '.listuser') {
                const users = readUsers();
                const list = users.map((u, i) => `${i + 1}. ${u}`).join('\n');
                await conn.sendMessage(from, {
                    text: `📋 *DAFTAR WHITELIST USER*\n\n${list}\n\n─────────────\nTotal: *${users.length} user terdaftar*`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .broadcast
            // =============================================
            if (command === '.broadcast') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *Format salah!*\n\n${formatHelp('broadcast')}`
                    }, { quoted: msg });
                    continue;
                }
                const users = readUsers();
                let sukses = 0;
                let gagal = 0;
                await conn.sendMessage(from, { text: `📢 Memulai broadcast ke ${users.length} user...` }, { quoted: msg });
                for (const num of users) {
                    try {
                        await conn.sendMessage(toJid(num), {
                            text: `📢 *BROADCAST dari Owner*\n\n${q}`
                        });
                        sukses++;
                        await new Promise(r => setTimeout(r, 1000));
                    } catch {
                        gagal++;
                    }
                }
                await conn.sendMessage(from, {
                    text: `✅ *Broadcast Selesai!*\n\n✅ Berhasil: ${sukses}\n❌ Gagal: ${gagal}\nTotal: ${users.length} user`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .block
            // =============================================
            if (command === '.block') {
                if (!q) {
                    await conn.sendMessage(from, { text: `⚠️ Gunakan: *.block [nomor]*\nContoh: .block 08123456789` }, { quoted: msg });
                    continue;
                }
                const targetJid = toJid(q);
                await conn.updateBlockStatus(targetJid, 'block');
                await conn.sendMessage(from, { text: `🚫 Nomor *${normalizeNumber(q)}* berhasil diblokir.` }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .unblock
            // =============================================
            if (command === '.unblock') {
                if (!q) {
                    await conn.sendMessage(from, { text: `⚠️ Gunakan: *.unblock [nomor]*\nContoh: .unblock 08123456789` }, { quoted: msg });
                    continue;
                }
                const targetJid = toJid(q);
                await conn.updateBlockStatus(targetJid, 'unblock');
                await conn.sendMessage(from, { text: `✅ Nomor *${normalizeNumber(q)}* berhasil di-unblock.` }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .menu / .mennu
            // =============================================
            if (command === '.menu' || command === '.mennu') {
                try {
                    const imgBuffer = await downloadBuffer(settings.menuImage);
                    await conn.sendMessage(from, {
                        image: imgBuffer,
                        caption: menuCaption
                    }, { quoted: msg });
                } catch {
                    await conn.sendMessage(from, { text: menuCaption }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .sticker / .stiker
            // =============================================
            if (command === '.sticker' || command === '.stiker') {
                let imgBuffer = null;
                const msgType = Object.keys(msg.message)[0];
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

                if (msgType === 'imageMessage') {
                    try {
                        imgBuffer = await conn.downloadMediaMessage(msg);
                    } catch (err) {
                        await conn.sendMessage(from, { text: `❌ Gagal mengunduh gambar: ${err.message}` }, { quoted: msg });
                        continue;
                    }
                } else if (quoted?.imageMessage) {
                    try {
                        const fakeMsg = {
                            message: { imageMessage: quoted.imageMessage },
                            key: { remoteJid: from, fromMe: false, id: 'quoted' }
                        };
                        imgBuffer = await conn.downloadMediaMessage(fakeMsg);
                    } catch (err) {
                        await conn.sendMessage(from, { text: `❌ Gagal mengunduh gambar dari reply: ${err.message}` }, { quoted: msg });
                        continue;
                    }
                } else {
                    await conn.sendMessage(from, {
                        text: `⚠️ *FORMAT SALAH!* Gagal membuat stiker.\n\n${formatHelp('sticker')}`
                    }, { quoted: msg });
                    continue;
                }

                await conn.sendMessage(from, { text: '⏳ Sedang membuat sticker...' }, { quoted: msg });
                try {
                    const webpBuffer = await imageToWebpBuffer(imgBuffer);
                    await conn.sendMessage(from, { sticker: webpBuffer }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ Gagal membuat sticker: ${err.message}\n\n💡 Pastikan *ffmpeg* sudah terinstall di perangkat kamu.\n• Termux: *pkg install ffmpeg*\n• VPS Linux: *apt install ffmpeg*`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .toimg
            // =============================================
            if (command === '.toimg') {
                const msgType = Object.keys(msg.message)[0];
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                let stickerBuffer = null;

                if (msgType === 'stickerMessage') {
                    stickerBuffer = await conn.downloadMediaMessage(msg);
                } else if (quoted?.stickerMessage) {
                    const fakeMsg = {
                        message: { stickerMessage: quoted.stickerMessage },
                        key: { remoteJid: from, fromMe: false, id: 'quoted' }
                    };
                    stickerBuffer = await conn.downloadMediaMessage(fakeMsg);
                } else {
                    await conn.sendMessage(from, {
                        text: `⚠️ *FORMAT SALAH!*\n\n${formatHelp('toimg')}`
                    }, { quoted: msg });
                    continue;
                }

                await conn.sendMessage(from, {
                    image: stickerBuffer,
                    caption: '✅ Sticker berhasil dikonversi ke gambar!'
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .tiktok / .tt
            // =============================================
            if (command === '.tiktok' || command === '.tt') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *LINK MASIH KOSONG!*\n\n${formatHelp('tiktok')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '⏳ Mengunduh video TikTok, harap tunggu...' }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(q)}`);
                    const data = res.data;
                    const videoUrl = data?.video?.noWatermark || data?.video?.watermark || null;
                    if (!videoUrl) throw new Error('URL video tidak ditemukan di respons API');
                    const videoBuf = await downloadBuffer(videoUrl);
                    await conn.sendMessage(from, {
                        video: videoBuf,
                        caption: `✅ *TikTok Downloader*\n\n📌 ${data.title || 'Video TikTok'}\n👤 @${data.author?.nickname || 'unknown'}\n\n💡 Kirim *.help tiktok* untuk panduan penggunaan`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mengunduh TikTok!*\n\nAlasan: ${err.message}\n\n${formatHelp('tiktok')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .instagram
            // =============================================
            if (command === '.instagram') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *LINK MASIH KOSONG!*\n\n${formatHelp('instagram')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '⏳ Mengunduh media Instagram, harap tunggu...' }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(q)}`);
                    const data = res.data?.data;
                    if (!data || !Array.isArray(data) || data.length === 0) throw new Error('Media tidak ditemukan');
                    const mediaUrl = data[0].url;
                    const mediaBuf = await downloadBuffer(mediaUrl);
                    const isVideo = data[0].type === 'video' || data[0].url.includes('.mp4');
                    if (isVideo) {
                        await conn.sendMessage(from, {
                            video: mediaBuf,
                            caption: '✅ *Instagram Downloader*\n💡 Ketik *.help instagram* untuk panduan'
                        }, { quoted: msg });
                    } else {
                        await conn.sendMessage(from, {
                            image: mediaBuf,
                            caption: '✅ *Instagram Downloader*\n💡 Ketik *.help instagram* untuk panduan'
                        }, { quoted: msg });
                    }
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mengunduh dari Instagram!*\n\nAlasan: ${err.message}\n\n${formatHelp('instagram')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .youtube / .play
            // =============================================
            if (command === '.youtube' || command === '.play') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *LINK/JUDUL MASIH KOSONG!*\n\n${formatHelp('youtube')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: `⏳ Mencari & mengunduh *"${q}"*...\nProses bisa memakan waktu 15-60 detik.` }, { quoted: msg });
                try {
                    const searchRes = await axios.get(`https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(q)}`);
                    const results = searchRes.data?.data;
                    if (!results || results.length === 0) throw new Error('Tidak ada hasil pencarian ditemukan');
                    const video = results[0];
                    const dlRes = await axios.get(`https://api.agatz.xyz/api/ytdl?url=${encodeURIComponent(video.url)}&format=mp3`);
                    const mp3Url = dlRes.data?.data?.url;
                    if (!mp3Url) throw new Error('URL audio tidak dapat ditemukan');
                    const audioBuf = await downloadBuffer(mp3Url);
                    await conn.sendMessage(from, {
                        audio: audioBuf,
                        mimetype: 'audio/mpeg',
                        fileName: `${video.title || 'audio'}.mp3`,
                        ptt: false
                    }, { quoted: msg });
                    await conn.sendMessage(from, {
                        text: `✅ *YouTube Downloader*\n\n🎵 ${video.title || q}\n⏱ Durasi: ${video.duration || '-'}\n👁 Views: ${video.viewCount || '-'}\n\n💡 Ketik *.help youtube* untuk panduan lengkap`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mengunduh dari YouTube!*\n\nAlasan: ${err.message}\n\n${formatHelp('youtube')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .pinterest
            // =============================================
            if (command === '.pinterest') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *KATA KUNCI KOSONG!*\n\n${formatHelp('pinterest')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: `⏳ Mencari gambar Pinterest: *"${q}"*...` }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/pinterest?message=${encodeURIComponent(q)}`);
                    const images = res.data?.data;
                    if (!images || images.length === 0) throw new Error('Tidak ada hasil ditemukan');
                    const randomImg = images[Math.floor(Math.random() * Math.min(images.length, 10))];
                    const imgBuf = await downloadBuffer(randomImg);
                    await conn.sendMessage(from, {
                        image: imgBuf,
                        caption: `🖼️ *Pinterest*\nQuery: ${q}\n\n💡 Ketik lagi *.pinterest ${q}* untuk gambar berbeda`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mencari gambar Pinterest!*\n\nAlasan: ${err.message}\n\n${formatHelp('pinterest')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .ai / .ai2
            // =============================================
            if (command === '.ai' || command === '.ai2') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *PERTANYAAN KOSONG!*\n\n${formatHelp('ai')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '🤖 Memproses pertanyaan kamu...' }, { quoted: msg });
                try {
                    const apiUrl = command === '.ai2'
                        ? `https://api.agatz.xyz/api/deepseek?message=${encodeURIComponent(q)}`
                        : `https://api.agatz.xyz/api/chatgpt?message=${encodeURIComponent(q)}`;
                    const res = await axios.get(apiUrl);
                    const answer = res.data?.data || res.data?.message || res.data?.result || 'Tidak ada jawaban dari AI.';
                    await conn.sendMessage(from, {
                        text: `🤖 *${command === '.ai2' ? 'AI Logic Alternative' : 'ChatGPT'}*\n\n❓ *Pertanyaan:*\n${q}\n\n💬 *Jawaban:*\n${answer}`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal memproses AI!*\n\nAlasan: ${err.message}\n\n💡 Coba lagi beberapa saat kemudian.\nKetik *.help ai* untuk panduan penggunaan.`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .gemini
            // =============================================
            if (command === '.gemini') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *PERTANYAAN KOSONG!*\n\n${formatHelp('gemini')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '🧠 Memproses dengan Gemini AI...' }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/gemini?message=${encodeURIComponent(q)}`);
                    const answer = res.data?.data || res.data?.result || 'Tidak ada jawaban.';
                    await conn.sendMessage(from, {
                        text: `✨ *Gemini AI (Google)*\n\n❓ *Pertanyaan:*\n${q}\n\n💬 *Jawaban:*\n${answer}`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal memproses Gemini!*\n\nAlasan: ${err.message}\n\n${formatHelp('gemini')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .brainly
            // =============================================
            if (command === '.brainly') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *PERTANYAAN KOSONG!*\n\n${formatHelp('brainly')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '📚 Mencari jawaban di Brainly...' }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/brainly?message=${encodeURIComponent(q)}`);
                    const data = res.data?.data;
                    if (!data || data.length === 0) throw new Error('Tidak ditemukan jawaban');
                    const topAnswer = data[0];
                    await conn.sendMessage(from, {
                        text: `📖 *Brainly*\n\n❓ *Pertanyaan:*\n${topAnswer.question || q}\n\n✅ *Jawaban:*\n${topAnswer.answer || 'Tidak ada jawaban tersedia.'}`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mencari jawaban Brainly!*\n\nAlasan: ${err.message}\n\n${formatHelp('brainly')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .gimage
            // =============================================
            if (command === '.gimage') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *KATA KUNCI KOSONG!*\n\n${formatHelp('gimage')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: `🔍 Mencari gambar *"${q}"* di Google...` }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/gimage?message=${encodeURIComponent(q)}`);
                    const images = res.data?.data;
                    if (!images || images.length === 0) throw new Error('Tidak ada gambar ditemukan');
                    const imgUrl = images[Math.floor(Math.random() * Math.min(images.length, 5))];
                    const imgBuf = await downloadBuffer(imgUrl);
                    await conn.sendMessage(from, {
                        image: imgBuf,
                        caption: `🖼️ *Google Image*\nQuery: ${q}\n\n💡 Ketik lagi untuk gambar berbeda`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mencari gambar!*\n\nAlasan: ${err.message}\n\n${formatHelp('gimage')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .kbbi
            // =============================================
            if (command === '.kbbi') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *KATA KOSONG!*\n\n${formatHelp('kbbi')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: `📖 Mencari definisi *"${q}"* di KBBI...` }, { quoted: msg });
                try {
                    const res = await axios.get(`https://api.agatz.xyz/api/kbbi?message=${encodeURIComponent(q)}`);
                    const data = res.data?.data;
                    if (!data) throw new Error('Kata tidak ditemukan di KBBI');
                    let result = `📚 *KBBI — ${q.toUpperCase()}*\n\n`;
                    if (typeof data === 'string') {
                        result += data;
                    } else if (Array.isArray(data)) {
                        data.forEach((d, i) => { result += `${i + 1}. ${d.arti || d}\n`; });
                    } else {
                        result += JSON.stringify(data);
                    }
                    await conn.sendMessage(from, { text: result }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Kata "${q}" tidak ditemukan di KBBI!*\n\nAlasan: ${err.message}\n\n${formatHelp('kbbi')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .weather
            // =============================================
            if (command === '.weather') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *NAMA KOTA KOSONG!*\n\n${formatHelp('weather')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: `🌤 Mengambil data cuaca untuk *"${q}"*...` }, { quoted: msg });
                try {
                    const res = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=j1`);
                    const current = res.data?.current_condition?.[0];
                    const area = res.data?.nearest_area?.[0];
                    if (!current) throw new Error('Data cuaca tidak tersedia untuk kota ini');
                    const cityName = area?.areaName?.[0]?.value || q;
                    const country = area?.country?.[0]?.value || '';
                    const desc = current?.weatherDesc?.[0]?.value || '-';
                    const temp = current?.temp_C || '-';
                    const feels = current?.FeelsLikeC || '-';
                    const humidity = current?.humidity || '-';
                    const wind = current?.windspeedKmph || '-';
                    const visibility = current?.visibility || '-';
                    await conn.sendMessage(from, {
                        text: `🌍 *Cuaca — ${cityName}, ${country}*\n\n🌡️ Suhu: *${temp}°C* (Terasa ${feels}°C)\n🌤 Kondisi: *${desc}*\n💧 Kelembaban: *${humidity}%*\n💨 Kecepatan Angin: *${wind} km/h*\n👁 Jarak Pandang: *${visibility} km*`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal mengambil data cuaca!*\n\nAlasan: ${err.message}\n\n${formatHelp('weather')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .tts
            // =============================================
            if (command === '.tts') {
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *TEKS KOSONG!*\n\n${formatHelp('tts')}`
                    }, { quoted: msg });
                    continue;
                }
                await conn.sendMessage(from, { text: '🔊 Membuat audio dari teks...' }, { quoted: msg });
                try {
                    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=id&client=tw-ob`;
                    const audioBuf = await downloadBuffer(ttsUrl);
                    await conn.sendMessage(from, {
                        audio: audioBuf,
                        mimetype: 'audio/mpeg',
                        ptt: true
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal membuat TTS!*\n\nAlasan: ${err.message}\n\n${formatHelp('tts')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .runtime
            // =============================================
            if (command === '.runtime') {
                await conn.sendMessage(from, {
                    text: `⏱️ *Runtime Bot*\n\n${settings.botName} sudah berjalan selama:\n*${getRuntime()}*\n\n💡 Ketik *.help runtime* untuk info lebih lanjut`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .speed
            // =============================================
            if (command === '.speed') {
                const start = Date.now();
                await conn.sendMessage(from, { text: '⚡ Testing ping...' }, { quoted: msg });
                const latency = Date.now() - start;
                await conn.sendMessage(from, {
                    text: `⚡ *Speed Test Bot*\n\nLatency: *${latency}ms*\nStatus: ${latency < 500 ? '✅ CEPAT' : latency < 1000 ? '⚠️ NORMAL' : '❌ LAMBAT'}\n\n💡 Ketik *.help speed* untuk keterangan`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .tourl
            // =============================================
            if (command === '.tourl') {
                const msgType = Object.keys(msg.message)[0];
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                let mediaBuffer = null;
                let mime = 'image/jpeg';

                if (msgType === 'imageMessage') {
                    mediaBuffer = await conn.downloadMediaMessage(msg);
                    mime = msg.message.imageMessage.mimetype || 'image/jpeg';
                } else if (quoted?.imageMessage) {
                    const fakeMsg = {
                        message: { imageMessage: quoted.imageMessage },
                        key: { remoteJid: from, fromMe: false, id: 'q' }
                    };
                    mediaBuffer = await conn.downloadMediaMessage(fakeMsg);
                    mime = quoted.imageMessage.mimetype || 'image/jpeg';
                } else {
                    await conn.sendMessage(from, {
                        text: `⚠️ *FORMAT SALAH!*\n\n${formatHelp('tourl')}`
                    }, { quoted: msg });
                    continue;
                }

                await conn.sendMessage(from, { text: '⏳ Mengupload gambar...' }, { quoted: msg });
                try {
                    const FormData = require('form-data');
                    const form = new FormData();
                    form.append('file', mediaBuffer, { filename: 'upload.jpg', contentType: mime });
                    const res = await axios.post('https://telegra.ph/upload', form, {
                        headers: form.getHeaders()
                    });
                    const url = 'https://telegra.ph' + res.data[0].src;
                    await conn.sendMessage(from, {
                        text: `✅ *Upload Berhasil!*\n\n🔗 *URL Gambar:*\n${url}\n\n💡 Link ini bisa dibuka di browser & dibagikan ke siapa saja.`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ *Gagal upload gambar!*\n\nAlasan: ${err.message}\n\n${formatHelp('tourl')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .tebakgambar
            // =============================================
            if (command === '.tebakgambar') {
                await conn.sendMessage(from, { text: '🎮 Memuat soal tebak gambar...' }, { quoted: msg });
                try {
                    const res = await axios.get('https://api.agatz.xyz/api/tebakgambar');
                    const data = res.data?.data;
                    if (!data) throw new Error('Data tidak tersedia');
                    const imgBuf = await downloadBuffer(data.soal);
                    await conn.sendMessage(from, {
                        image: imgBuf,
                        caption: `🎮 *TEBAK GAMBAR*\n\n❓ Gambar apakah ini?\n\n_Jawab dalam 30 detik!_\n\n📌 Jawaban: ||${data.jawaban}||\n\n💡 Ketik *.help tebakgambar* untuk cara bermain`
                    }, { quoted: msg });
                } catch {
                    await conn.sendMessage(from, {
                        text: `❌ Gagal memuat soal tebak gambar. Coba lagi nanti.\n\n${formatHelp('tebakgambar')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .gantengcek
            // =============================================
            if (command === '.gantengcek') {
                const percent = Math.floor(Math.random() * 101);
                const filled = Math.floor(percent / 10);
                const bars = '█'.repeat(filled) + '░'.repeat(10 - filled);
                const label = percent >= 80 ? '😍 Sangat Ganteng!' : percent >= 60 ? '😊 Lumayan Ganteng' : percent >= 40 ? '😐 Biasa Saja' : '😅 Kurang Ganteng';
                await conn.sendMessage(from, {
                    text: `💪 *GANTENG METER*\n\n@${senderNum}\n\n[${bars}] *${percent}%*\n\n${label}\n\n💡 Ketik *.help gantengcek* untuk info`,
                    mentions: [senderJid]
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .couplecek
            // =============================================
            if (command === '.couplecek') {
                const percent = Math.floor(Math.random() * 101);
                const filled = Math.floor(percent / 20);
                const bars = '❤️'.repeat(filled) + '🖤'.repeat(5 - filled);
                const label = percent >= 80 ? '💑 Pasangan Sempurna!' : percent >= 60 ? '💕 Cocok Banget' : percent >= 40 ? '💛 Cukup Cocok' : '💔 Kurang Cocok';
                await conn.sendMessage(from, {
                    text: `💑 *COUPLE METER*\n\n@${senderNum}\n\n[${bars}] *${percent}%*\n\n${label}\n\n💡 Ketik *.help couplecek* untuk info`,
                    mentions: [senderJid]
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .quotes
            // =============================================
            if (command === '.quotes') {
                try {
                    const res = await axios.get('https://api.quotable.io/random');
                    const { content, author } = res.data;
                    await conn.sendMessage(from, {
                        text: `💬 *Quote Hari Ini*\n\n_"${content}"_\n\n— *${author}*\n\n💡 Ketik lagi *.quotes* untuk quote berbeda`
                    }, { quoted: msg });
                } catch {
                    const localQuotes = [
                        { text: 'Kesuksesan adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.', author: 'Colin Powell' },
                        { text: 'Jangan hitung hari-harimu, buat hari-harimu terhitung.', author: 'Muhammad Ali' },
                        { text: 'Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang kamu lakukan.', author: 'Steve Jobs' },
                        { text: 'Hidup adalah 10% apa yang terjadi padamu dan 90% bagaimana kamu meresponsnya.', author: 'Charles R. Swindoll' },
                        { text: 'Percayalah kamu bisa, dan kamu sudah setengah jalan.', author: 'Theodore Roosevelt' }
                    ];
                    const q2 = localQuotes[Math.floor(Math.random() * localQuotes.length)];
                    await conn.sendMessage(from, {
                        text: `💬 *Quote*\n\n_"${q2.text}"_\n\n— *${q2.author}*`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .removebg
            // =============================================
            if (command === '.removebg') {
                await conn.sendMessage(from, {
                    text: `⚠️ *Fitur Belum Aktif*\n\n${formatHelp('removebg')}`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER .remini
            // =============================================
            if (command === '.remini') {
                await conn.sendMessage(from, {
                    text: `⚠️ *Fitur Belum Aktif*\n\n${formatHelp('remini')}`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // HANDLER GROUP: .kick
            // =============================================
            if (command === '.kick') {
                if (!isGroup) {
                    await conn.sendMessage(from, { text: '⚠️ Perintah ini hanya bisa digunakan di dalam *grup*!' }, { quoted: msg });
                    continue;
                }
                const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
                if (!mentioned || mentioned.length === 0) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *TAG ANGGOTA DULU!*\n\n${formatHelp('kick')}`
                    }, { quoted: msg });
                    continue;
                }
                try {
                    await conn.groupParticipantsUpdate(from, mentioned, 'remove');
                    await conn.sendMessage(from, {
                        text: `✅ Berhasil mengeluarkan *${mentioned.length}* anggota dari grup.`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ Gagal kick anggota!\n\nAlasan: ${err.message}\n\n⚠️ Pastikan bot sudah menjadi *admin grup*.`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER GROUP: .add
            // =============================================
            if (command === '.add') {
                if (!isGroup) {
                    await conn.sendMessage(from, { text: '⚠️ Perintah ini hanya bisa digunakan di dalam *grup*!' }, { quoted: msg });
                    continue;
                }
                if (!q) {
                    await conn.sendMessage(from, {
                        text: `⚠️ *NOMOR KOSONG!*\n\n${formatHelp('add')}`
                    }, { quoted: msg });
                    continue;
                }
                const targetJid = toJid(q);
                try {
                    await conn.groupParticipantsUpdate(from, [targetJid], 'add');
                    await conn.sendMessage(from, {
                        text: `✅ Berhasil menambahkan *${normalizeNumber(q)}* ke grup.`
                    }, { quoted: msg });
                } catch (err) {
                    await conn.sendMessage(from, {
                        text: `❌ Gagal menambahkan anggota!\n\nAlasan: ${err.message}\n\n⚠️ Pastikan bot sudah menjadi *admin grup* dan nomor aktif di WhatsApp.`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER GROUP: .group open/close
            // =============================================
            if (command === '.group') {
                if (!isGroup) {
                    await conn.sendMessage(from, { text: '⚠️ Perintah ini hanya bisa digunakan di dalam *grup*!' }, { quoted: msg });
                    continue;
                }
                const sub = args[0]?.toLowerCase();
                if (sub === 'open') {
                    try {
                        await conn.groupSettingUpdate(from, 'not_announcement');
                        await conn.sendMessage(from, { text: '✅ Grup *dibuka*. Semua anggota bisa mengirim pesan.' }, { quoted: msg });
                    } catch (err) {
                        await conn.sendMessage(from, { text: `❌ Gagal membuka grup: ${err.message}` }, { quoted: msg });
                    }
                } else if (sub === 'close') {
                    try {
                        await conn.groupSettingUpdate(from, 'announcement');
                        await conn.sendMessage(from, { text: '🔒 Grup *ditutup*. Hanya admin yang bisa mengirim pesan.' }, { quoted: msg });
                    } catch (err) {
                        await conn.sendMessage(from, { text: `❌ Gagal menutup grup: ${err.message}` }, { quoted: msg });
                    }
                } else {
                    await conn.sendMessage(from, {
                        text: `⚠️ *FORMAT SALAH!*\n\n${formatHelp('group')}`
                    }, { quoted: msg });
                }
                continue;
            }

            // =============================================
            // HANDLER .clear
            // =============================================
            if (command === '.clear') {
                await conn.sendMessage(from, {
                    text: `⚠️ Fitur *.clear* tidak didukung oleh API Baileys secara native.\n\n💡 Gunakan fitur bawaan WhatsApp:\nTekan & tahan chat → Hapus Pesan → Hapus Semua.`
                }, { quoted: msg });
                continue;
            }

            // =============================================
            // PERINTAH TIDAK DIKENAL — saran ke user
            // =============================================
            await conn.sendMessage(from, {
                text: `❓ Perintah *${command}* tidak dikenal.\n\n📋 Ketik *.menu* untuk melihat daftar perintah.\n📖 Ketik *.help* untuk panduan cara penggunaan.`
            }, { quoted: msg });
        }
    });
}

startBot().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
});
