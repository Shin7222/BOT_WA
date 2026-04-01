"use strict";

const { rob, getUser } = require("../../database/db");
const { getNumber, formatDuration } = require("../../utils/helper");

module.exports = {
  name: "rampok",
  alias: ["rob", "steal", "copet"],
  category: "economy",
  description: "Coba rampok koin user lain (ada risiko gagal!)",
  usage: ".rampok @user",

  async run({ sock, msg, jid, sender, senderNumber, args, usedPrefix }) {
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];

    if (!target) {
      return sock.sendMessage(
        jid,
        {
          text: `🔪 *Rampok*\n\nTag user yang ingin dirampok!\nContoh: *${usedPrefix}rampok @user*\n\n⚠️ *Risiko:*\n• Berhasil: dapat 10-30% koin target\n• Gagal: kena denda 50-100 koin\n• Peluang sukses: 40% (60% jika punya ⚔️)\n• Target bisa dilindungi 🛡️`,
        },
        { quoted: msg },
      );
    }

    const targetNum = getNumber(target).replace(/:[0-9]+/, "");
    const result = rob(sender, target);

    // ── Error cases ───────────────────────────────────
    if (!result.ok) {
      if (result.reason === "self") {
        return sock.sendMessage(
          jid,
          { text: "😂 Tidak bisa merampok diri sendiri!" },
          { quoted: msg },
        );
      }
      if (result.reason === "too_poor") {
        return sock.sendMessage(
          jid,
          {
            text: `😅 @${targetNum} terlalu miskin untuk dirampok! (< 50 koin)`,
            mentions: [target],
          },
          { quoted: msg },
        );
      }
      if (result.reason === "shielded") {
        return sock.sendMessage(
          jid,
          {
            text: `🛡️ @${targetNum} sedang terlindungi oleh *Perisai*!\nCoba lagi nanti setelah perisainya habis (24 jam).`,
            mentions: [target],
          },
          { quoted: msg },
        );
      }
      if (result.reason === "cooldown") {
        return sock.sendMessage(
          jid,
          {
            text: `⏳ Masih cooldown!\nBisa rampok lagi dalam: *${formatDuration(result.remaining)}*`,
          },
          { quoted: msg },
        );
      }
    }

    const robberAfter = getUser(sender);
    const targetAfter = getUser(target);

    // ── Berhasil ──────────────────────────────────────
    if (result.success) {
      await sock.sendMessage(
        jid,
        {
          text: `🔪 *Perampokan Berhasil!* 😈\n\n🎯 Target : @${targetNum}\n💰 Dicuri : +${result.amount.toLocaleString("id-ID")} koin\n💼 Koinmu : ${robberAfter.coins.toLocaleString("id-ID")}\n\n_"Tangan cepat, kaki lebih cepat!"_`,
          mentions: [target],
        },
        { quoted: msg },
      );

      // Notif ke korban
      try {
        await sock.sendMessage(target.replace(/:[0-9]+@/, "@"), {
          text: `😱 *Kamu dirampok oleh @${senderNumber}!*\n\n💸 Koin hilang : -${result.amount.toLocaleString("id-ID")}\n💼 Sisa koin  : ${targetAfter.coins.toLocaleString("id-ID")}\n\n🛡️ Beli *Perisai* di toko untuk proteksi!\n*${usedPrefix}toko beli shield*`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }

      // ── Gagal ─────────────────────────────────────────
    } else {
      await sock.sendMessage(
        jid,
        {
          text: `😵 *Perampokan Gagal!*\n\n🎯 Target : @${targetNum}\n💸 Denda  : -${result.fine.toLocaleString("id-ID")} koin\n💼 Koinmu : ${robberAfter.coins.toLocaleString("id-ID")}\n\n_"Kena batunya! Latih lagi skill merampokmmu"_\n\n💡 Beli ⚔️ *Pedang* untuk peluang sukses lebih tinggi!`,
          mentions: [target],
        },
        { quoted: msg },
      );

      // Notif ke target (dapat koin denda)
      try {
        await sock.sendMessage(target.replace(/:[0-9]+@/, "@"), {
          text: `😤 @${senderNumber} mencoba merampokmu tapi *GAGAL!*\n💰 Kamu dapat denda: +${result.fine.toLocaleString("id-ID")} koin`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }
    }
  },
};
