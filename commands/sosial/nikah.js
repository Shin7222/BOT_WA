"use strict";

const {
  propose,
  acceptMarriage,
  rejectProposal,
  divorce,
  getMarriage,
  getPartner,
  getPendingProposal,
  getUser,
} = require("../../database/db");
const { getNumber, formatDuration } = require("../../utils/helper");

module.exports = {
  name: "nikah",
  alias: ["marry", "kawin", "marriage"],
  category: "social",
  description: "Sistem pernikahan antar user",
  usage:
    ".nikah [@user] | .nikah terima | .nikah tolak | .nikah cerai | .nikah info",

  async run({ sock, msg, jid, sender, senderNumber, args, usedPrefix }) {
    const sub = args[0]?.toLowerCase();
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];

    // ── .nikah info — status pernikahan ──────────────
    if (!sub || sub === "info" || sub === "status") {
      const partner = getPartner(sender);
      const marriage = getMarriage(sender);
      const pending = getPendingProposal(sender);

      if (partner) {
        const partnerNum = getNumber(partner).replace(/:[0-9]+/, "");
        const daysTogether = Math.floor(
          (Date.now() - (marriage?.marriedAt || Date.now())) / 86400000,
        );
        return sock.sendMessage(
          jid,
          {
            text: `💒 *Status Pernikahan*\n\n💍 Pasangan : @${partnerNum}\n📅 Menikah  : ${daysTogether} hari yang lalu\n\n_Gunakan ${usedPrefix}nikah cerai untuk bercerai_`,
            mentions: [partner],
          },
          { quoted: msg },
        );
      }

      if (pending) {
        const fromNum = getNumber(pending.from).replace(/:[0-9]+/, "");
        return sock.sendMessage(
          jid,
          {
            text: `💌 *Ada Lamaran Untukmu!*\n\n👤 Dari: @${fromNum}\n\nKetik:\n• *${usedPrefix}nikah terima* — terima lamaran\n• *${usedPrefix}nikah tolak* — tolak lamaran`,
            mentions: [pending.from],
          },
          { quoted: msg },
        );
      }

      return sock.sendMessage(
        jid,
        {
          text: `💔 *Kamu masih lajang!*\n\nGunakan *${usedPrefix}nikah @user* untuk melamar seseorang.`,
        },
        { quoted: msg },
      );
    }

    // ── .nikah terima ─────────────────────────────────
    if (sub === "terima" || sub === "accept" || sub === "iya") {
      const result = acceptMarriage(sender);

      if (!result.ok) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Tidak ada lamaran untukmu saat ini!`,
          },
          { quoted: msg },
        );
      }

      const partnerNum = getNumber(result.partner).replace(/:[0-9]+/, "");
      await sock.sendMessage(
        jid,
        {
          text: `💒 *Selamat! Kalian Resmi Menikah!* 🎊\n\n👰🤵 @${senderNumber} & @${partnerNum}\n\n💍 Semoga langgeng selamanya!\n_"Dua jiwa, satu hati"_`,
          mentions: [sender, result.partner],
        },
        { quoted: msg },
      );

      // Notifikasi ke pasangan
      try {
        await sock.sendMessage(result.partner, {
          text: `💒 *@${senderNumber} menerima lamaranmu!*\n\nKalian kini resmi menikah! 💍🎊`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }

      return;
    }

    // ── .nikah tolak ──────────────────────────────────
    if (sub === "tolak" || sub === "reject" || sub === "tidak") {
      const result = rejectProposal(sender);

      if (!result.ok) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Tidak ada lamaran yang bisa ditolak!`,
          },
          { quoted: msg },
        );
      }

      const fromNum = getNumber(result.from).replace(/:[0-9]+/, "");
      await sock.sendMessage(
        jid,
        {
          text: `💔 Lamaran dari @${fromNum} telah ditolak.`,
          mentions: [result.from],
        },
        { quoted: msg },
      );

      // Notifikasi ke pelamar
      try {
        await sock.sendMessage(result.from, {
          text: `💔 *Lamaranmu ditolak oleh @${senderNumber}.*\n\nJangan patah semangat! 🌹`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }

      return;
    }

    // ── .nikah cerai ──────────────────────────────────
    if (sub === "cerai" || sub === "divorce") {
      const partner = getPartner(sender);
      if (!partner) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Kamu belum menikah!`,
          },
          { quoted: msg },
        );
      }

      const partnerNum = getNumber(partner).replace(/:[0-9]+/, "");
      const marriage = getMarriage(sender);
      const days = Math.floor(
        (Date.now() - (marriage?.marriedAt || Date.now())) / 86400000,
      );

      divorce(sender);

      await sock.sendMessage(
        jid,
        {
          text: `💔 *Perceraian Resmi*\n\n@${senderNumber} dan @${partnerNum} telah bercerai.\nLama menikah: ${days} hari.\n\n_Semoga menemukan kebahagiaan masing-masing._`,
          mentions: [sender, partner],
        },
        { quoted: msg },
      );

      // Notifikasi ke mantan pasangan
      try {
        await sock.sendMessage(partner, {
          text: `💔 *@${senderNumber} telah menceraikanmu.*`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }

      return;
    }

    // ── .nikah @user — lamar seseorang ───────────────
    if (target) {
      if (target === sender) {
        return sock.sendMessage(
          jid,
          {
            text: `😂 Kamu tidak bisa melamar diri sendiri!`,
          },
          { quoted: msg },
        );
      }

      const targetNum = getNumber(target).replace(/:[0-9]+/, "");
      const result = propose(sender, target);

      if (!result.ok) {
        const msgs = {
          already_married_self: `❌ Kamu sudah menikah! Cerai dulu dengan *${usedPrefix}nikah cerai*`,
          already_married_target: `❌ @${targetNum} sudah menikah dengan orang lain!`,
          already_proposed: `❌ Kamu sudah pernah melamar @${targetNum}! Tunggu jawabannya.`,
          self_propose: `😂 Kamu tidak bisa melamar diri sendiri!`,
        };
        return sock.sendMessage(
          jid,
          {
            text: msgs[result.reason] || "❌ Gagal melamar!",
            mentions: [target],
          },
          { quoted: msg },
        );
      }

      await sock.sendMessage(
        jid,
        {
          text: `💌 *Lamaran Terkirim!*\n\n💍 @${senderNumber} melamar @${targetNum}\n\n_Menunggu jawaban..._`,
          mentions: [sender, target],
        },
        { quoted: msg },
      );

      // Notifikasi ke target
      try {
        const targetJid = target.replace(/:[0-9]+@/, "@");
        await sock.sendMessage(targetJid, {
          text: `💌 *@${senderNumber} melamarmu!* 💍\n\nBalas:\n• *${usedPrefix}nikah terima* — terima\n• *${usedPrefix}nikah tolak* — tolak`,
          mentions: [sender],
        });
      } catch {
        /* abaikan */
      }

      return;
    }

    // ── Help ──────────────────────────────────────────
    await sock.sendMessage(
      jid,
      {
        text: `💒 *Marriage System*\n\n• *${usedPrefix}nikah @user*   — lamar seseorang\n• *${usedPrefix}nikah terima* — terima lamaran\n• *${usedPrefix}nikah tolak*  — tolak lamaran\n• *${usedPrefix}nikah cerai*  — bercerai\n• *${usedPrefix}nikah info*   — lihat status`,
      },
      { quoted: msg },
    );
  },
};
