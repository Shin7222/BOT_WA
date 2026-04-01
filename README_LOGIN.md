# 🔐 Dokumentasi Sistem Login WhatsApp Bot

## Daftar Isi
1. [Struktur Folder Session](#1-struktur-folder-session)
2. [Login via QR Code](#2-login-via-qr-code)
3. [Login via Nomor HP](#3-login-via-nomor-hp)
4. [Auto Reconnect](#4-auto-reconnect)
5. [Session Manager](#5-session-manager)
6. [Command Logout](#6-command-logout)
7. [Cara Menjalankan Bot](#7-cara-menjalankan-bot)
8. [Deploy di VPS](#8-deploy-di-vps)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Struktur Folder Session

```
/whatsapp-bot
│
├── session/
│   └── bot-session/             ← Session aktif
│       ├── creds.json           ← Kredensial login utama
│       ├── app-state-sync-*.json
│       ├── pre-key-*.json
│       └── session-*.json
│
├── session/backup_1234567890/   ← Backup (dibuat via !session backup)
│   └── creds.json
│
├── core/
│   ├── auth.js                  ← Logika login QR / nomor
│   ├── connection.js            ← State & health-check
│   └── sessionManager.js        ← CRUD session
│
└── commands/admin/
    ├── logout.js                ← !logout
    └── session.js               ← !session
```

> **Penting:** Jangan pernah share isi folder `session/` ke orang lain.
> File `creds.json` berisi kredensial akun WhatsApp kamu!

---

## 2. Login via QR Code

### Cara kerja
1. Jalankan bot → pilih **opsi 1**
2. QR muncul di terminal
3. Buka WhatsApp di HP → **Perangkat Tertaut** → **Tautkan Perangkat**
4. Scan QR
5. Session tersimpan otomatis di `/session/bot-session/`
6. Restart berikutnya: **tidak perlu scan ulang**

### Kode inti (sudah ada di `core/auth.js`)
```js
// QR tampil via event 'connection.update'
sock.ev.on('connection.update', ({ qr }) => {
  if (qr) qrcode.generate(qr, { small: true });
});
```

---

## 3. Login via Nomor HP

### Cara kerja
1. Jalankan bot → pilih **opsi 2**
2. Masukkan nomor: `6281234567890` (format internasional, tanpa +)
3. Bot meminta **Pairing Code** ke WhatsApp kamu
4. Buka WhatsApp → **Perangkat Tertaut** → **Tautkan dengan Nomor Telepon**
5. Masukkan kode yang muncul di terminal (format: `XXXX-XXXX`)
6. Session tersimpan otomatis

### Format nomor yang valid
```
✅ 6281234567890    (Indonesia, benar)
✅ 6285678901234
❌ 081234567890     (akan dikonversi otomatis ke 6281...)
❌ +6281234567890   (strip + otomatis)
❌ 08 1234 5678     (spasi dibuang otomatis)
```

### Kode inti
```js
// Minta pairing code
const code = await sock.requestPairingCode(phoneNumber);
console.log('Kode:', code); // contoh: A1B2-C3D4
```

> **Catatan:** Metode nomor membutuhkan `mobile: true` di konfigurasi socket.

---

## 4. Auto Reconnect

Bot akan **otomatis reconnect** jika koneksi terputus dengan strategi **exponential backoff**:

| Percobaan | Delay    |
|-----------|----------|
| 1         | 5 detik  |
| 2         | 10 detik |
| 3         | 15 detik |
| 4         | 20 detik |
| 5         | 25 detik |

Setelah **5x gagal**, bot berhenti dan perlu direstart manual.

### Jenis disconnect & perilaku bot

| Kode         | Kondisi                    | Aksi Bot                       |
|--------------|----------------------------|---------------------------------|
| `loggedOut`  | Di-logout dari HP          | Hapus session → exit            |
| `badSession` | Session corrupt/kedaluarsa | Hapus session → login ulang     |
| `replaced`   | Digantikan perangkat lain  | Exit                            |
| Lainnya      | Koneksi putus sementara    | Reconnect otomatis              |

---

## 5. Session Manager

Kelola session langsung dari chat bot:

```
!session info     — lihat status & ukuran session
!session backup   — buat backup session
!session restore  — pulihkan dari backup terbaru
!session delete   — hapus session (bot perlu login ulang)
```

### Validasi session programatik
```js
const { validateSession } = require('./core/sessionManager');

const valid = await validateSession();
if (!valid) {
  // session rusak, hapus & login ulang
}
```

---

## 6. Command Logout

Hanya **owner bot** yang bisa menjalankan command ini.

```
!logout           — logout biasa (hapus session)
!logout backup    — backup dulu baru logout
```

Setelah `!logout`:
- Bot meminta konfirmasi: ketik **CONFIRM**
- Session dihapus
- Koneksi diputus resmi via `sock.logout()`
- Restart bot untuk login ulang

---

## 7. Cara Menjalankan Bot

### Persiapan awal
```bash
# 1. Clone / masuk ke folder project
cd whatsapp-bot

# 2. Install dependencies
npm install

# 3. Salin .env dan isi konfigurasi
cp .env.example .env
nano .env   # isi OWNER_NUMBER, BOT_NAME, dll

# 4. Jalankan bot
node index.js
```

### Tampilan saat pertama kali (belum ada session)
```
╔═══════════════════════════════════╗
║        🤖 WhatsApp Bot            ║
╠═══════════════════════════════════╣
║  Bot Name : MyBot                 ║
╚═══════════════════════════════════╝

┌─────────────────────────────┐
│   Pilih Metode Login Bot    │
├─────────────────────────────┤
│  1. QR Code  (scan HP)      │
│  2. Nomor HP (kode OTP)     │
└─────────────────────────────┘

Masukkan pilihan (1/2): _
```

---

## 8. Deploy di VPS

### Menggunakan PM2 (direkomendasikan)
```bash
# Install PM2
npm install -g pm2

# Jalankan bot dengan PM2
pm2 start index.js --name whatsapp-bot

# Auto-start saat VPS reboot
pm2 startup
pm2 save

# Lihat log real-time
pm2 logs whatsapp-bot

# Restart bot
pm2 restart whatsapp-bot
```

### ecosystem.config.js (opsional, untuk konfigurasi PM2)
```js
module.exports = {
  apps: [{
    name      : 'whatsapp-bot',
    script    : 'index.js',
    instances : 1,           // jangan lebih dari 1 (1 nomor = 1 instance)
    autorestart: true,
    watch     : false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
```

### Tips VPS
```bash
# Gunakan screen jika tidak pakai PM2
screen -S whatsapp-bot
node index.js
# Ctrl+A lalu D untuk detach

# Reconnect ke screen
screen -r whatsapp-bot
```

---

## 9. Troubleshooting

### ❌ QR tidak muncul
```bash
# Pastikan terminal mendukung unicode
# Coba jalankan dengan --no-color jika ada masalah encoding
node index.js

# Atau matikan animasi QR, lihat qrcode-terminal docs
```

### ❌ Session corrupt / bot tidak bisa login
```bash
# Hapus folder session manual
rm -rf session/bot-session/

# Lalu jalankan ulang
node index.js
```

### ❌ Error "Stream Errored (unknown)"
Biasanya koneksi internet putus. Bot akan reconnect otomatis.

### ❌ Error "Connection Replaced"
WhatsApp hanya izinkan **1 instance** per nomor di Linked Devices.
Pastikan tidak ada instance bot lain yang berjalan.

### ❌ Kode OTP tidak datang
- Pastikan nomor benar (format: `628xxx`)
- Tunggu 1-2 menit
- Coba metode QR sebagai alternatif

### ✅ Tips Anti-Ban Saat Login
- Gunakan nomor yang **bukan nomor utama** untuk bot
- Jangan restart bot terlalu sering (> 5x/jam bisa trigger ban)
- Gunakan `Browsers.ubuntu('Chrome')` di konfigurasi socket
- Set `markOnlineOnConnect: false`
