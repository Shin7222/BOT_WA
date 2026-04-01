'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');

const pino   = require('pino');
const qrcode = require('qrcode-terminal');
const path   = require('path');
const fs     = require('fs-extra');
const chalk  = require('chalk');

const config = require('../config');
const logger = require('../utils/logger');

const SESSION_DIR    = path.join(__dirname, '..', 'session', config.sessionName);
const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = 5_000;

// ─────────────────────────────────────────────────────
// Hapus session
// ─────────────────────────────────────────────────────
async function clearSession() {
  if (await fs.pathExists(SESSION_DIR)) {
    await fs.remove(SESSION_DIR);
    logger.warn('Session dihapus.');
  }
}

// ─────────────────────────────────────────────────────
// Buat socket
// ─────────────────────────────────────────────────────
async function createSocket(state) {
  const { version } = await fetchLatestBaileysVersion();
  const msgCache    = new Map();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys : makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser              : Browsers.ubuntu('Chrome'),
    syncFullHistory      : false,
    markOnlineOnConnect  : false,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      return msgCache.get(key.remoteJid + ':' + key.id) ?? { conversation: '' };
    },
    shouldIgnoreJid: jid => isJidBroadcast(jid),
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      msgCache.set(msg.key.remoteJid + ':' + msg.key.id, msg.message);
      if (msgCache.size > 500) msgCache.delete(msgCache.keys().next().value);
    }
  });

  return sock;
}

// ─────────────────────────────────────────────────────
// startConnection — entry point tunggal
//
// Logika login:
//   • Sudah ada session  → langsung connect, tidak tanya apa-apa
//   • Belum ada session  → cek PAIRING_NUMBER di .env
//       - ada  → pairing code (tampil di terminal, sekali saja)
//       - tidak → QR code
// ─────────────────────────────────────────────────────
async function startConnection(onReady, onMessage, opts = {}) {
  const retryCount = opts.retryCount ?? 0;

  await fs.ensureDir(SESSION_DIR);
  const hasSession = await fs.pathExists(path.join(SESSION_DIR, 'creds.json'));

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const sock = await createSocket(state);

  // Nomor untuk pairing code (dari .env), hanya dipakai saat belum ada session
  // Nomor dari .env — dukung semua kode negara
  // Format: kode negara + nomor (tanpa +, tanpa spasi)
  // Indonesia: 628xxx | Venezuela: 584xxx | US: 1xxx | Malaysia: 601xxx
  const rawNumber    = (process.env.PAIRING_NUMBER || '').replace(/\D/g, '');
  const pairingNumber = rawNumber;
  const usePairing   = !hasSession && pairingNumber.length >= 7;

  // Flag agar requestPairingCode hanya dipanggil sekali
  let pairingDone = false;

  if (!hasSession) {
    if (usePairing) {
      console.log(chalk.green('\n📲 Login via Pairing Code'));
      console.log(chalk.white(`   Nomor : ${chalk.bold(pairingNumber)}`));
      console.log(chalk.white('   Menunggu koneksi ke WhatsApp...\n'));
    } else {
      console.log(chalk.green('\n📱 Login via QR Code'));
      console.log(chalk.white('   Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat\n'));
    }
  } else {
    logger.info('Session ditemukan. Menghubungkan...');
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    // Tampilkan QR (hanya jika tidak pakai pairing code)
    if (qr && !usePairing) {
      console.clear();
      console.log(chalk.bold.green('\n🔳 Scan QR Code ini dengan WhatsApp:\n'));
      qrcode.generate(qr, { small: true });
      console.log(chalk.gray('\n(QR refresh otomatis tiap ~20 detik)\n'));
    }

    // ── Koneksi terbuka ────────────────────
    if (connection === 'open') {

      // Kirim pairing code — hanya SEKALI saat pertama kali open
      if (usePairing && !pairingDone) {
        pairingDone = true;
        try {
          const code      = await sock.requestPairingCode(pairingNumber);
          const formatted = (code ?? '').match(/.{1,4}/g)?.join('-') ?? code;

          console.log(chalk.cyan('\n┌──────────────────────────────────┐'));
          console.log(chalk.cyan(`│  🔑 Kode Pairing: ${chalk.bold.yellow(String(formatted).padEnd(15))}│`));
          console.log(chalk.cyan('└──────────────────────────────────┘'));
          console.log(chalk.white('\n   Masukkan kode ini di WhatsApp:'));
          console.log(chalk.white('   HP → Perangkat Tertaut → Tautkan dengan Nomor Telepon\n'));
        } catch (err) {
          logger.error('Gagal meminta pairing code:', err.message);
        }
        // Jangan panggil onReady dulu — tunggu login benar-benar selesai
        return;
      }

      // Login sudah selesai (pairing berhasil atau QR scan berhasil)
      const botNumber = sock.user?.id?.split(':')[0] ?? '?';
      console.log(chalk.bold.green('\n✅ Bot berhasil terhubung!'));
      console.log(chalk.white(`   Nomor : ${chalk.bold(botNumber)}`));
      console.log(chalk.white(`   Nama  : ${chalk.bold(sock.user?.name ?? '-')}`));
      console.log(chalk.white(`   Waktu : ${new Date().toLocaleString('id-ID')}\n`));

      if (opts.retryCount > 0) logger.success('Reconnect berhasil!');
      if (typeof onReady === 'function') onReady(sock);
    }

    // ── Koneksi terputus ───────────────────
    if (connection === 'close') {
      const code   = lastDisconnect?.error?.output?.statusCode;
      const reason = DisconnectReason[code] ?? code;
      logger.warn(`Koneksi terputus. Alasan: ${reason} (${code})`);

      switch (code) {
        case DisconnectReason.loggedOut:
          logger.error('Bot di-logout! Hapus session dan restart.');
          await clearSession();
          process.exit(0);
          break;

        case DisconnectReason.badSession:
          logger.error('Session rusak! Membuat session baru...');
          await clearSession();
          startConnection(onReady, onMessage, { retryCount: 0 });
          break;

        case DisconnectReason.connectionReplaced:
          logger.error('Koneksi digantikan perangkat lain!');
          process.exit(1);
          break;

        default:
          if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * (retryCount + 1);
            logger.info(`Reconnect ${retryCount + 1}/${MAX_RETRIES} dalam ${delay / 1000}s...`);
            setTimeout(
              () => startConnection(onReady, onMessage, { retryCount: retryCount + 1 }),
              delay,
            );
          } else {
            logger.error('Maks reconnect tercapai. Bot berhenti.');
            process.exit(1);
          }
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    if (typeof onMessage === 'function') onMessage(sock, messages);
  });

  return sock;
}

module.exports = { startConnection, clearSession, SESSION_DIR };
