"use strict";

const {
  getUser,
  isPremium: checkPremium,
  getUserBadges,
  checkAndAwardBadges,
  getPartner,
  getMarriage,
} = require("../../database/db");
const {
  getNumber,
  progressBar,
  formatDuration,
} = require("../../utils/helper");
const config = require("../../config");

module.exports = {
  name: "profil",
  alias: ["profile", "me", "stat"],
  category: "social",
  description: "Lihat profil kamu atau user lain",
  usage: ".profil [@user]",
  useLimit: false,

  async run({
    sock,
    msg,
    jid,
    sender,
    senderNumber,
    args,
    usedPrefix,
    isOwner,
  }) {
    // Tentukan target: mention atau diri sendiri
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || sender;
    const targetNum = getNumber(target).replace(/:[0-9]+/, "");
    const isSelf =
      target === sender || targetNum === senderNumber.replace(/:[0-9]+/, "");

    // Award badge baru jika ada
    const newBadges = checkAndAwardBadges(target);

    const user = getUser(target);
    const premium = checkPremium(target);
    const badges = getUserBadges(target);
    const partner = getPartner(target);
    const marriage = getMarriage(target);

    // Hitung progress ke level berikutnya
    const level = user.level || 1;
    const exp = user.exp || 0;
    const nextExp = Math.pow(level * 10, 2);
    const curExp = exp % nextExp;
    const bar = progressBar(curExp, nextExp, 10);

    // Role
    const ownerNums = config.ownerNumber || [];
    const role = ownerNums.includes(targetNum)
      ? "👑 Owner"
      : premium
        ? "⭐ Premium"
        : "👤 User";

    // Bergabung sejak
    const joinedAgo = user.registeredAt
      ? formatDuration(Date.now() - user.registeredAt) + " lalu"
      : "Tidak diketahui";

    // Partner
    let partnerText = "❌ Lajang";
    if (partner) {
      const partnerNum = getNumber(partner).replace(/:[0-9]+/, "");
      const daysTogether = marriage
        ? Math.floor((Date.now() - marriage.marriedAt) / 86400000)
        : 0;
      partnerText = `💑 @${partnerNum} (${daysTogether} hari)`;
    }

    // Badge display
    const badgeDisplay = badges.length
      ? badges.map((b) => `${b.emoji} ${b.name}`).join("\n│ ")
      : "─ Belum ada badge";

    const text = `╭─────────────────────╮
│  👤 *PROFIL USER*
╰─────────────────────╯
│
├ 📛 Nomor   : @${targetNum}
├ 🎭 Role    : ${role}
├ 🕐 Bergabung: ${joinedAgo}
│
├ 📊 *STATISTIK*
├ 🏆 Level   : ${level}
├ ✨ EXP     : ${bar} ${curExp}/${nextExp}
├ 💰 Koin    : ${(user.coins || 0).toLocaleString("id-ID")}
├ 📨 Limit   : ${user.usedLimit || 0}/${premium ? 100 : 20} hari ini
│
├ 💒 *PASANGAN*
├ ${partnerText}
│
├ 🏅 *BADGE (${badges.length})*
│ ${badgeDisplay}
╰─────────────────────

${newBadges.length ? `🎉 *Badge baru didapat:*\n${newBadges.map((b) => `${b.emoji} ${b.name}`).join("\n")}` : ""}`.trim();

    await sock.sendMessage(
      jid,
      {
        text,
        mentions: [target, ...(partner ? [partner] : [])],
      },
      { quoted: msg },
    );
  },
};
