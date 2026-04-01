"use strict";

const { sendGift, getUser } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

module.exports = {
  name: "hadiah",
  alias: ["gift", "kasih", "kirimkoin"],
  category: "social",
  description: "Kirim koin sebagai hadiah ke user lain",
  usage: ".hadiah @user <jumlah>",

  async run({ sock, msg, jid, sender, senderNumber, args, usedPrefix }) {
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];
    const amount = parseInt(args.find((a) => !isNaN(a) && parseInt(a) > 0));

    // ── Validasi input ───────────────────────────────
    if (!target) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Tag user yang ingin diberi hadiah!\n\nContoh: *${usedPrefix}hadiah @user 100*`,
        },
        { quoted: msg },
      );
    }

    if (!amount || amount < 1) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan jumlah koin yang valid!\n\nContoh: *${usedPrefix}hadiah @user 100*`,
        },
        { quoted: msg },
      );
    }

    const senderUser = getUser(sender);
    const targetNum = getNumber(target).replace(/:[0-9]+/, "");

    // ── Kirim hadiah ─────────────────────────────────
    const result = sendGift(sender, target, amount);

    if (!result.ok) {
      const msgs = {
        insufficient: `❌ Koin kamu tidak cukup!\nKoin saat ini: *${senderUser.coins}* | Dibutuhkan: *${amount}*`,
        invalid_amount: `❌ Jumlah koin tidak valid!`,
        self_gift: `❌ Tidak bisa mengirim hadiah ke diri sendiri!`,
      };
      return sock.sendMessage(
        jid,
        {
          text: msgs[result.reason] || "❌ Gagal mengirim hadiah!",
        },
        { quoted: msg },
      );
    }

    const senderAfter = getUser(sender);
    const targetAfter = getUser(target);

    // Notifikasi ke pengirim
    await sock.sendMessage(
      jid,
      {
        text: `🎁 *Hadiah Terkirim!*\n\n👤 Dari  : @${senderNumber}\n🎯 Untuk : @${targetNum}\n💰 Jumlah: ${amount.toLocaleString("id-ID")} koin\n\n💼 Sisa koinmu: ${senderAfter.coins.toLocaleString("id-ID")}`,
        mentions: [sender, target],
      },
      { quoted: msg },
    );

    // Notifikasi ke penerima (jika private chat berbeda)
    if (!jid.endsWith("@g.us")) return;
    try {
      await sock.sendMessage(target, {
        text: `🎁 *Kamu mendapat hadiah!*\n\n👤 Dari  : @${senderNumber}\n💰 Jumlah: +${amount.toLocaleString("id-ID")} koin\n💼 Total koin: ${targetAfter.coins.toLocaleString("id-ID")}`,
        mentions: [sender],
      });
    } catch {
      // Abaikan jika gagal kirim private
    }
  },
};
