/**
 * commands/admin/logout.js
 * Command !logout — hanya bisa dijalankan owner bot.
 * Menghapus session dan memaksa login ulang.
 */

'use strict';

const { deleteSession, backupSession } = require('../../core/sessionManager');
const logger = require('../../utils/logger');

module.exports = {
  name       : 'logout',
  alias      : ['signout'],
  category   : 'admin',
  description: 'Logout bot dan hapus session (owner only)',
  usage      : '!logout [backup]',
  ownerOnly  : true,
  useLimit   : false,

  async run({ sock, msg, jid, args }) {
    const doBackup = args[0]?.toLowerCase() === 'backup';

    // ── Konfirmasi ──────────────────────────────────
    await sock.sendMessage(jid, {
      text: `⚠️ *Konfirmasi Logout*\n\n` +
            `Bot akan:\n` +
            `${doBackup ? '• ✅ Backup session terlebih dahulu\n' : ''}` +
            `• 🗑️ Menghapus semua data session\n` +
            `• 🔌 Memutus koneksi WhatsApp\n` +
            `• 🔄 Memerlukan login ulang\n\n` +
            `Balas *CONFIRM* dalam 30 detik untuk melanjutkan.`,
    }, { quoted: msg });

    // ── Tunggu konfirmasi ───────────────────────────
    const confirmed = await waitConfirmation(sock, jid, msg.key.participant || msg.key.remoteJid);

    if (!confirmed) {
      return sock.sendMessage(jid, {
        text: '❌ Logout dibatalkan.',
      }, { quoted: msg });
    }

    // ── Proses logout ───────────────────────────────
    await sock.sendMessage(jid, {
      text: '🔄 Memproses logout...',
    }, { quoted: msg });

    try {
      // Backup opsional
      if (doBackup) {
        const backupPath = await backupSession();
        if (backupPath) {
          await sock.sendMessage(jid, {
            text: `✅ Session di-backup ke:\n\`${backupPath}\``,
          });
        }
      }

      // Hapus session
      await deleteSession();
      logger.warn('[Logout] Session dihapus oleh owner.');

      await sock.sendMessage(jid, {
        text: `✅ *Logout berhasil!*\n\nSession telah dihapus.\nJalankan ulang bot untuk login kembali.`,
      });

      // Logout dari Baileys (cabut koneksi secara resmi)
      await sock.logout();

    } catch (err) {
      logger.error('[Logout] Error:', err.message);
      await sock.sendMessage(jid, {
        text: `❌ Error saat logout: ${err.message}`,
      }, { quoted: msg });
    }
  },
};

// ─────────────────────────────────────────────────────
// Helper — tunggu pesan konfirmasi "CONFIRM"
// ─────────────────────────────────────────────────────

function waitConfirmation(sock, jid, senderJid, timeoutMs = 30_000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      sock.ev.off('messages.upsert', handler);
      resolve(false);
    }, timeoutMs);

    function handler({ messages, type }) {
      if (type !== 'notify') return;
      for (const m of messages) {
        const from = m.key.participant || m.key.remoteJid;
        if (from !== senderJid) continue;

        const text = (
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          ''
        ).trim().toUpperCase();

        if (text === 'CONFIRM') {
          clearTimeout(timer);
          sock.ev.off('messages.upsert', handler);
          resolve(true);
        }
      }
    }

    sock.ev.on('messages.upsert', handler);
  });
}
