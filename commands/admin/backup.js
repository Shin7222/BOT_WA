"use strict";

const {
  backupDatabase,
  restoreDatabase,
  listDatabaseBackups,
} = require("../../database/db");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "backup",
  alias: ["db", "database"],
  category: "admin",
  description: "Backup & restore database bot",
  usage: ".backup | .backup restore <nama_file>",
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const sub = args[0]?.toLowerCase();

    // ── .backup list ──────────────────────────────────
    if (sub === "list" || sub === "ls") {
      const backups = listDatabaseBackups();
      if (!backups.length) {
        return sock.sendMessage(
          jid,
          {
            text: "📂 Belum ada backup database.",
          },
          { quoted: msg },
        );
      }
      const list = backups
        .map((b, i) => `${i + 1}. \`${b.name}\`\n   └ ${b.date} | ${b.size} KB`)
        .join("\n\n");
      return sock.sendMessage(
        jid,
        {
          text: `📂 *Daftar Backup Database*\n\n${list}\n\nGunakan:\n*${usedPrefix}backup restore <nama_file>*`,
        },
        { quoted: msg },
      );
    }

    // ── .backup restore <file> ────────────────────────
    if (sub === "restore") {
      const fileName = args[1];
      if (!fileName) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Masukkan nama file backup!\nContoh: *${usedPrefix}backup restore backup_1234567.json*\n\nLihat daftar: *${usedPrefix}backup list*`,
          },
          { quoted: msg },
        );
      }

      const dbDir = path.join(__dirname, "../../database");
      const backupPath = path.join(dbDir, fileName);

      if (!(await fs.pathExists(backupPath))) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ File backup *${fileName}* tidak ditemukan!\n\nLihat daftar: *${usedPrefix}backup list*`,
          },
          { quoted: msg },
        );
      }

      // Backup dulu sebelum restore
      backupDatabase();
      restoreDatabase(backupPath);

      return sock.sendMessage(
        jid,
        {
          text: `✅ *Database berhasil di-restore!*\n\nDari: \`${fileName}\`\n\n⚠️ Restart bot untuk memastikan semua data termuat dengan benar.`,
        },
        { quoted: msg },
      );
    }

    // ── .backup — buat backup baru ────────────────────
    const dest = backupDatabase();
    const fname = path.basename(dest);
    const size = Math.round((await fs.stat(dest)).size / 1024);
    const backups = listDatabaseBackups();

    await sock.sendMessage(
      jid,
      {
        text: `✅ *Backup Database Berhasil!*\n\n📄 File  : \`${fname}\`\n💾 Ukuran: ${size} KB\n📂 Total backup: ${backups.length}\n\n*Perintah lain:*\n• \`${usedPrefix}backup list\`           — daftar backup\n• \`${usedPrefix}backup restore <file>\` — restore`,
      },
      { quoted: msg },
    );
  },
};
