"use strict";

const {
  setCoins,
  setLevel,
  addCoinsDirect,
  addLevelDirect,
  getUser,
} = require("../../database/db");
const { getNumber } = require("../../utils/helper");

module.exports = {
  name: "manipulasi",
  alias: ["manip", "set", "edit"],
  category: "admin",
  description: "Manipulasi koin / level user",
  usage: ".set coins @user +/-<jumlah> | .set level @user +/-<jumlah>",
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const type = args[0]?.toLowerCase(); // coins / level
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];

    // ── Help ──────────────────────────────────────────
    if (!type || !target) {
      return sock.sendMessage(
        jid,
        {
          text: `🔧 *Manipulasi User*

*Koin:*
• \`${usedPrefix}set coins @user 500\`   — set koin jadi 500
• \`${usedPrefix}set coins @user +200\`  — tambah 200 koin
• \`${usedPrefix}set coins @user -100\`  — kurangi 100 koin

*Level:*
• \`${usedPrefix}set level @user 10\`    — set level jadi 10
• \`${usedPrefix}set level @user +5\`    — naik 5 level
• \`${usedPrefix}set level @user -2\`    — turun 2 level

*Cek user:*
• \`${usedPrefix}set info @user\`         — lihat data user`,
        },
        { quoted: msg },
      );
    }

    const targetNum = getNumber(target).replace(/:[0-9]+/, "");

    // ── Info user ─────────────────────────────────────
    if (type === "info") {
      const u = getUser(target);
      return sock.sendMessage(
        jid,
        {
          text: `📋 *Data @${targetNum}*\n\n💰 Koin  : ${u.coins}\n🏆 Level : ${u.level}\n✨ EXP   : ${u.exp}\n⭐ Premium: ${u.premium ? "Ya" : "Tidak"}\n⚠️ Warn  : ${u.warnings || 0}`,
          mentions: [target],
        },
        { quoted: msg },
      );
    }

    // Ambil nilai dari args (bisa +100, -50, atau 100)
    const rawVal = args.find((a, i) => i > 0 && /^[+-]?\d+$/.test(a));
    if (!rawVal) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan nilai!\nContoh: *${usedPrefix}set coins @user +500*`,
        },
        { quoted: msg },
      );
    }

    const isRelative = rawVal.startsWith("+") || rawVal.startsWith("-");
    const value = parseInt(rawVal);
    const userBefore = getUser(target);
    let newValue;
    let fieldLabel;

    // ── Set Koin ──────────────────────────────────────
    if (type === "coins" || type === "koin" || type === "coin") {
      if (isRelative) {
        newValue = addCoinsDirect(target, value);
      } else {
        setCoins(target, value);
        newValue = value;
      }
      fieldLabel = "💰 Koin";

      return sock.sendMessage(
        jid,
        {
          text: `✅ *Koin @${targetNum} diubah!*

${fieldLabel}:
  Sebelum : ${userBefore.coins.toLocaleString("id-ID")}
  Perubahan: ${isRelative ? (value >= 0 ? "+" : "") + value : "→ " + value}
  Sesudah : ${newValue.toLocaleString("id-ID")}`,
          mentions: [target],
        },
        { quoted: msg },
      );
    }

    // ── Set Level ─────────────────────────────────────
    if (type === "level" || type === "lvl") {
      if (isRelative) {
        newValue = addLevelDirect(target, value);
      } else {
        setLevel(target, value);
        newValue = value;
      }
      fieldLabel = "🏆 Level";

      return sock.sendMessage(
        jid,
        {
          text: `✅ *Level @${targetNum} diubah!*

${fieldLabel}:
  Sebelum : ${userBefore.level}
  Perubahan: ${isRelative ? (value >= 0 ? "+" : "") + value : "→ " + value}
  Sesudah : ${newValue}`,
          mentions: [target],
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: `❌ Tipe tidak dikenal: *${type}*\nGunakan: \`coins\` atau \`level\``,
      },
      { quoted: msg },
    );
  },
};
