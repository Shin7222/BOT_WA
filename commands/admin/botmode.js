/**
 * commands/admin/botmode.js
 * ─────────────────────────────────────────────────────
 * Command !botmode — ganti mode bot (private/public)
 * tanpa perlu restart. Hanya owner yang bisa.
 *
 * Penggunaan:
 *   !botmode          → lihat mode aktif
 *   !botmode public   → aktifkan mode publik
 *   !botmode private  → aktifkan mode privat
 * ─────────────────────────────────────────────────────
 */

'use strict';

const config = require('../../config');
const logger = require('../../utils/logger');

// Label & deskripsi tiap mode
const MODE_INFO = {
  public: {
    emoji: '🌐',
    label: 'PUBLIC',
    desc : 'Bot dapat digunakan semua orang di mana saja\n(grup maupun private chat)',
  },
  private: {
    emoji: '🔒',
    label: 'PRIVATE',
    desc : 'Bot HANYA merespons di private chat langsung\nke nomor bot. Semua pesan dari grup diabaikan.',
  },
};

module.exports = {
  name       : 'botmode',
  alias      : ['mode', 'setmode'],
  category   : 'admin',
  description: 'Lihat atau ganti mode bot (public / private)',
  usage      : '!botmode [public|private]',
  ownerOnly  : true,
  useLimit   : false,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const input = args[0]?.toLowerCase();

    // ── Tampilkan status mode aktif ─────────────────
    if (!input) {
      const cur = MODE_INFO[config.botMode] ?? MODE_INFO.public;
      return sock.sendMessage(jid, {
        text:
          `${cur.emoji} *Mode Bot Saat Ini: ${cur.label}*\n\n` +
          `📋 ${cur.desc}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🔧 *Ganti Mode:*\n` +
          `• \`${usedPrefix}botmode public\`  — mode publik\n` +
          `• \`${usedPrefix}botmode private\` — mode privat`,
      }, { quoted: msg });
    }

    // ── Validasi input ──────────────────────────────
    if (!['public', 'private'].includes(input)) {
      return sock.sendMessage(jid, {
        text:
          `❌ Mode tidak valid!\n\n` +
          `Pilihan yang tersedia:\n` +
          `• \`${usedPrefix}botmode public\`\n` +
          `• \`${usedPrefix}botmode private\``,
      }, { quoted: msg });
    }

    // ── Tidak ada perubahan ─────────────────────────
    if (config.botMode === input) {
      const cur = MODE_INFO[input];
      return sock.sendMessage(jid, {
        text: `ℹ️ Bot sudah dalam mode *${cur.label}*.`,
      }, { quoted: msg });
    }

    // ── Terapkan mode baru ──────────────────────────
    const prev    = config.botMode;
    config.botMode = input;

    const next = MODE_INFO[input];
    logger.info(`[BotMode] Diganti: ${prev.toUpperCase()} → ${input.toUpperCase()}`);

    await sock.sendMessage(jid, {
      text:
        `✅ *Mode bot berhasil diubah!*\n\n` +
        `${next.emoji} Mode aktif: *${next.label}*\n\n` +
        `📋 ${next.desc}\n\n` +
        `⚡ Perubahan berlaku *sekarang juga*.\n` +
        `_(Untuk permanen, ubah \`BOT_MODE\` di file \`.env\`)_`,
    }, { quoted: msg });
  },
};
