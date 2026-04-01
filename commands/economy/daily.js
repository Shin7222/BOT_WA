"use strict";

const { claimDaily, getUser } = require("../../database/db");
const { formatDuration } = require("../../utils/helper");

module.exports = {
  name: "daily",
  alias: ["claim", "hadir", "absen"],
  category: "economy",
  description: "Klaim koin harian (reset tiap 24 jam)",
  usage: ".daily",
  useLimit: false,

  async run({ sock, msg, jid, sender, usedPrefix }) {
    const result = claimDaily(sender);

    if (!result.ok) {
      const sisa = formatDuration(result.remaining);
      return sock.sendMessage(
        jid,
        {
          text: `⏳ *Sudah klaim hari ini!*\n\nKamu bisa klaim lagi dalam:\n*${sisa}*\n\n💡 Klaim setiap hari untuk menjaga streak bonus!`,
        },
        { quoted: msg },
      );
    }

    const user = getUser(sender);
    const streakBar =
      "🔥".repeat(Math.min(result.streak, 7)) +
      (result.streak > 7 ? ` x${result.streak}` : "");
    const hasPickaxe = (user.inventory || []).includes("pickaxe");

    const text = `✅ *Daily Claim Berhasil!*

💰 Koin didapat : +${result.amount}
${hasPickaxe ? "⛏️ Bonus Cangkul : +50%\n" : ""}🔥 Streak       : ${streakBar} (${result.streak} hari)
⭐ Bonus streak : +${result.bonus} koin

💼 Total koin   : ${user.coins.toLocaleString("id-ID")}

${result.streak >= 7 ? "🎉 *Streak 7 hari! Pertahankan terus!*" : `📅 Klaim lagi besok untuk streak *${result.streak + 1}*!`}`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
