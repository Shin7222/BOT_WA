/**
 * commands/admin/session.js
 * Cek status session + opsi backup/restore
 */

'use strict';

const {
  getSessionInfo,
  backupSession,
  restoreLatestBackup,
  deleteSession,
} = require('../../core/sessionManager');

module.exports = {
  name       : 'session',
  alias      : ['sesi'],
  category   : 'admin',
  description: 'Kelola session bot',
  usage      : '!session [info|backup|restore]',
  ownerOnly  : true,
  useLimit   : false,

  async run({ sock, msg, jid, args }) {
    const sub = args[0]?.toLowerCase() || 'info';

    // ── !session info ───────────────────────────────
    if (sub === 'info') {
      const info = await getSessionInfo();
      const text =
        `🗂️ *Info Session*\n\n` +
        `📂 Path     : \`${info.path}\`\n` +
        `✅ Ada      : ${info.exists   ? 'Ya'    : 'Tidak'}\n` +
        `🔐 Valid    : ${info.valid    ? 'Ya'    : 'Tidak / Corrupt'}\n` +
        `📄 File     : ${info.fileCount} berkas\n` +
        `💾 Ukuran   : ${info.sizeKB} KB`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── !session backup ─────────────────────────────
    if (sub === 'backup') {
      const bp = await backupSession();
      return sock.sendMessage(jid, {
        text: bp
          ? `✅ Backup berhasil!\nDisimpan di:\n\`${bp}\``
          : '❌ Tidak ada session untuk di-backup.',
      }, { quoted: msg });
    }

    // ── !session restore ────────────────────────────
    if (sub === 'restore') {
      const ok = await restoreLatestBackup();
      return sock.sendMessage(jid, {
        text: ok
          ? '✅ Session dipulihkan dari backup terbaru.\nRestart bot untuk menerapkan perubahan.'
          : '❌ Tidak ada backup yang tersedia.',
      }, { quoted: msg });
    }

    // ── !session delete ─────────────────────────────
    if (sub === 'delete') {
      await deleteSession();
      return sock.sendMessage(jid, {
        text: '🗑️ Session dihapus.\nBot perlu login ulang saat di-restart.',
      }, { quoted: msg });
    }

    // ── Help ────────────────────────────────────────
    await sock.sendMessage(jid, {
      text:
        `🗂️ *Kelola Session*\n\n` +
        `• !session info    — cek status\n` +
        `• !session backup  — buat backup\n` +
        `• !session restore — pulihkan backup\n` +
        `• !session delete  — hapus session`,
    }, { quoted: msg });
  },
};
