"use strict";

const { transfer, getUser } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

module.exports = {
  name: "transfer",
  alias: ["kirim", "send", "tf"],
  category: "economy",
  description: "Transfer koin ke user lain",
  usage: ".transfer @user <jumlah>",

  async run({ sock, msg, jid, sender, senderNumber, args, usedPrefix }) {
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];
    const amount = parseInt(args.find((a) => !isNaN(a) && parseInt(a) > 0));

    if (!target) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Tag user tujuan!\nContoh: *${usedPrefix}transfer @user 200*`,
        },
        { quoted: msg },
      );
    }
    if (!amount) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan jumlah koin!\nContoh: *${usedPrefix}transfer @user 200*`,
        },
        { quoted: msg },
      );
    }

    const result = transfer(sender, target, amount);
    const targetNum = getNumber(target).replace(/:[0-9]+/, "");
    const senderAfter = getUser(sender);
    const targetAfter = getUser(target);

    if (!result.ok) {
      const msgs = {
        self: "❌ Tidak bisa transfer ke diri sendiri!",
        invalid: "❌ Jumlah tidak valid!",
        insufficient: `❌ Koin tidak cukup!\nKoin kamu: *${getUser(sender).coins}* | Dibutuhkan: *${amount}*`,
      };
      return sock.sendMessage(
        jid,
        { text: msgs[result.reason] || "❌ Gagal transfer!" },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: `💸 *Transfer Berhasil!*\n\n👤 Dari   : @${senderNumber}\n🎯 Ke     : @${targetNum}\n💰 Jumlah : ${amount.toLocaleString("id-ID")} koin\n\n💼 Sisa koinmu: ${senderAfter.coins.toLocaleString("id-ID")}`,
        mentions: [sender, target],
      },
      { quoted: msg },
    );

    // Notif ke penerima
    try {
      await sock.sendMessage(target.replace(/:[0-9]+@/, "@"), {
        text: `💸 *Kamu menerima transfer!*\n\n👤 Dari   : @${senderNumber}\n💰 Jumlah : +${amount.toLocaleString("id-ID")} koin\n💼 Total  : ${targetAfter.coins.toLocaleString("id-ID")} koin`,
        mentions: [sender],
      });
    } catch {
      /* abaikan */
    }
  },
};
