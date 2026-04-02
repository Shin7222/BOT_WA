# 🤖 ShinBot — WhatsApp Bot

Bot WhatsApp modular berbasis **Baileys** dengan sistem limit, economy, games, downloader, dan fitur sosial.

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env   # isi konfigurasi
node index.js
```

> **Node.js** >= 18 diperlukan.

---

## ⚙️ Konfigurasi `.env`

| Key | Keterangan | Default |
|-----|------------|---------|
| `BOT_NAME` | Nama bot | `MyBot` |
| `OWNER_NUMBER` | Nomor owner (628xxx) | — |
| `PREFIX` | Prefix command | `!./` |
| `SESSION_NAME` | Nama session Baileys | `bot-session` |
| `PAIRING_NUMBER` | Nomor bot untuk pairing code | — |
| `BOT_MODE` | `public` / `private` | `public` |
| `USER_LIMIT` | Limit harian user biasa | `20` |
| `PREMIUM_LIMIT` | Limit harian premium | `100` |
| `COMMAND_COOLDOWN` | Cooldown command (detik) | `3` |
| `WEATHER_API_KEY` | API key OpenWeatherMap | ❌ wajib isi |
| `OPENAI_API_KEY` | API key OpenAI | ❌ wajib isi |
| `AUTO_READ` | Auto centang biru | `true` |
| `MAINTENANCE` | Mode maintenance | `false` |

---

## 📋 Daftar Fitur

### 🛠️ Tools

| Fitur | Command | Status |
|-------|---------|--------|
| Menu / Help | `.menu` `.help` `.start` | ✅ Aktif |
| Kalkulator | `.calc` | ✅ Aktif |
| Cek Cuaca | `.cuaca` | ⚠️ Butuh `WEATHER_API_KEY` |
| Terjemahan Teks | `.translate` | ✅ Aktif (via MyMemory API) |
| Persingkat URL | `.shortlink` | ✅ Aktif |
| Generate Password | `.password` | ✅ Aktif |
| Hitung Umur | `.umur` | ✅ Aktif |
| Buat QR Code | `.qr` | ✅ Aktif |
| Cek Limit Harian | `.limit` | ✅ Aktif |

---

### 🎮 Games

| Fitur | Command | Status |
|-------|---------|--------|
| Tebak Angka | `.tebakangka` | ✅ Aktif |
| Batu Gunting Kertas | `.suit` | ✅ Aktif |
| Slot Machine | `.slot` | ✅ Aktif |
| Trivia / Kuis | `.trivia` | ✅ Aktif |
| Hangman | `.hangman` | ✅ Aktif |

---

### 📥 Downloader

| Fitur | Command | Status |
|-------|---------|--------|
| YouTube MP3 / MP4 | `.yt mp3` / `.yt mp4` | ✅ Aktif |
| TikTok No Watermark | `.tiktok` | ✅ Aktif |
| Instagram | `.ig` | ✅ Aktif |
| Buat Sticker | `.sticker` | ✅ Aktif |

---

### 💰 Economy

| Fitur | Command | Status |
|-------|---------|--------|
| Klaim Koin Harian | `.daily` | ✅ Aktif |
| Transfer Koin | `.transfer` | ✅ Aktif |
| Leaderboard | `.leaderboard` | ✅ Aktif |
| Toko Item Virtual | `.toko` | ✅ Aktif |
| Rampok Koin User | `.rampok` | ✅ Aktif |

---

### 👥 Sosial

| Fitur | Command | Status |
|-------|---------|--------|
| Lihat Profil | `.profil` | ✅ Aktif |
| Koleksi Badge | `.badge` | ✅ Aktif |
| Kirim Hadiah / Koin | `.hadiah` | ✅ Aktif |
| Marriage System | `.nikah` | ✅ Aktif |

---

### 🌸 Anime

| Fitur | Command | Status |
|-------|---------|--------|
| Anime Quote | `.animequote` | ✅ Aktif |
| Gacha Karakter | `.gacha` | ✅ Aktif (pakai koin) |
| Random Waifu | `.waifu` | ✅ Aktif |
| Random Husbando | `.husbando` | ✅ Aktif |
| Info Karakter Anime | `.karakter` | ✅ Aktif |

---

### 👥 Group

| Fitur | Command | Status |
|-------|---------|--------|
| Pesan Welcome/Bye | `.welcome` | ✅ Aktif (via event) |
| Anti Kata Kasar | `.antitoxic` | ✅ Aktif |
| Kick Member | `.kick` | ✅ Aktif |

---

### ⚙️ Admin Bot (Owner Only)

| Fitur | Command | Status |
|-------|---------|--------|
| Broadcast ke Semua | `.broadcast` | ✅ Aktif |
| Ganti Mode Bot | `.botmode` | ✅ Aktif |
| Mode Maintenance | `.maintenance` | ✅ Aktif |
| Backup Database | `.backup` | ✅ Aktif |
| Edit Level / Koin User | `.set` | ✅ Aktif |
| Statistik Bot | `.stats` | ✅ Aktif |
| Logout Session | `.logout` | ✅ Aktif |
| Matikan Bot | `.shutdown` | ✅ Aktif |

---

### 🔐 Sistem & Core

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Login via Pairing Code | ✅ Aktif | Isi `PAIRING_NUMBER` di `.env` |
| Login via QR Code | ✅ Aktif | Kosongkan `PAIRING_NUMBER` |
| Multi-prefix | ✅ Aktif | Default: `! . /` |
| Multi-owner | ✅ Aktif | Pisah koma di `OWNER_NUMBER` |
| Sistem Limit Harian | ✅ Aktif | User 20x / Premium 100x |
| Sistem Premium User | ✅ Aktif | |
| Sistem Level & EXP | ✅ Aktif | |
| Anti-Spam / Cooldown | ✅ Aktif | |
| Auto Read (centang biru) | ✅ Aktif | Konfigurasi via `AUTO_READ` |
| Mode Public / Private | ✅ Aktif | Konfigurasi via `BOT_MODE` |
| Database JSON (lowdb) | ✅ Aktif | File `database/database.json` |
| Fitur AI / ChatGPT | ❌ Belum ada | `OPENAI_API_KEY` tersedia tapi command belum dibuat |

---

## 📁 Struktur Folder

```
whatsapp-bot/
├── commands/
│   ├── admin/        # Command khusus owner
│   ├── anime/        # Fitur anime
│   ├── downloader/   # Downloader media
│   ├── economy/      # Sistem ekonomi
│   ├── games/        # Mini games
│   ├── group/        # Manajemen grup
│   ├── premium/      # Sistem premium
│   ├── sosial/       # Fitur sosial
│   └── tools/        # Tools umum
├── core/             # Auth, connection, session
├── database/         # db.js & database.json
├── events/           # Event grup (welcome/bye)
├── utils/            # Helper, anti-spam, queue, logger
├── index.js          # Entry point
├── handler.js        # Command handler
└── config.js         # Konfigurasi utama
```

---

## 📝 Catatan

- Fitur **cuaca** membutuhkan API key gratis dari [openweathermap.org](https://openweathermap.org/api)
- Fitur **AI/ChatGPT** belum diimplementasikan meski `OPENAI_API_KEY` sudah disiapkan di config
- Database disimpan dalam format JSON — untuk produksi disarankan migrasi ke SQLite/MySQL
