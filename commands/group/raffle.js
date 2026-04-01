"use strict";

const { addCoins, getUser } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

// { groupId: { prize, participants: Set<jid>, host, active, endTime, timer, description } }
const raffles = new Map();

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} detik`;
  if (s < 3600) return `${Math.floor(s / 60)} menit`;
  return `${Math.floor(s / 3600)} jam`;
}

module.exports = {
  name: "raffle",
  alias: ["giveaway", "undian", "lotere"],
  category: "group",
  description: "Buat giveaway/undian di group",
  usage: ".raffle <hadiah> [durasi menit]  contoh: .raffle 500 koin 10",
  groupOnly: true,

  async run({
    sock,
    msg,
    jid,
    sender,
    senderNumber,
    args,
    fullArgs,
    isOwner,
    isGroupAdmin,
    usedPrefix,
  }) {
    const sub = args[0]?.toLowerCase();

    // ── Join raffle ───────────────────────────────────
    if (sub === "join" || sub === "ikut" || sub === "daftar") {
      const raffle = raffles.get(jid);
      if (!raffle?.active) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Tidak ada raffle aktif!\nBuat raffle: \`${usedPrefix}raffle <hadiah>\``,
          },
          { quoted: msg },
        );
      }
      if (raffle.participants.has(sender)) {
        return sock.sendMessage(
          jid,
          {
            text: `ℹ️ Kamu sudah terdaftar!\n👥 Total peserta: ${raffle.participants.size}`,
          },
          { quoted: msg },
        );
      }
      raffle.participants.add(sender);
      return sock.sendMessage(
        jid,
        {
          text: `✅ @${senderNumber} berhasil ikut raffle!\n\n🎁 Hadiah: *${raffle.description}*\n👥 Total peserta: *${raffle.participants.size}*\n⏰ Berakhir: ${formatMs(raffle.endTime - Date.now())} lagi`,
          mentions: [sender],
        },
        { quoted: msg },
      );
    }

    // ── Info raffle ───────────────────────────────────
    if (sub === "info" || sub === "status") {
      const raffle = raffles.get(jid);
      if (!raffle?.active) {
        return sock.sendMessage(
          jid,
          { text: "❌ Tidak ada raffle aktif!" },
          { quoted: msg },
        );
      }
      return sock.sendMessage(
        jid,
        {
          text: `🎰 *Info Raffle*\n\n🎁 Hadiah   : ${raffle.description}\n👥 Peserta  : ${raffle.participants.size} orang\n⏰ Berakhir : ${formatMs(raffle.endTime - Date.now())} lagi\n\nIkut: \`${usedPrefix}raffle join\``,
        },
        { quoted: msg },
      );
    }

    // ── Stop raffle manual ────────────────────────────
    if (sub === "stop" || sub === "end") {
      if (!isGroupAdmin && !isOwner) {
        return sock.sendMessage(
          jid,
          { text: "❌ Hanya admin yang bisa menghentikan raffle!" },
          { quoted: msg },
        );
      }
      const raffle = raffles.get(jid);
      if (!raffle?.active) {
        return sock.sendMessage(
          jid,
          { text: "❌ Tidak ada raffle aktif!" },
          { quoted: msg },
        );
      }
      clearTimeout(raffle.timer);
      await endRaffle(sock, jid, raffle);
      return;
    }

    // ── Buat raffle baru ──────────────────────────────
    if (!isGroupAdmin && !isOwner) {
      return sock.sendMessage(
        jid,
        { text: "❌ Hanya admin yang bisa membuat raffle!" },
        { quoted: msg },
      );
    }

    if (raffles.get(jid)?.active) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Sudah ada raffle aktif!\nHentikan dulu: \`${usedPrefix}raffle stop\``,
        },
        { quoted: msg },
      );
    }

    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `🎰 *Raffle / Giveaway*\n\n*Cara buat:*\n\`${usedPrefix}raffle <hadiah> [durasi menit]\`\n\nContoh:\n• \`${usedPrefix}raffle 500 koin 10\` — raffle 500 koin, 10 menit\n• \`${usedPrefix}raffle iPhone 15\` — raffle item, 30 menit (default)\n\n*Peserta:*\n\`${usedPrefix}raffle join\` — ikut raffle`,
        },
        { quoted: msg },
      );
    }

    // Parse durasi dari akhir args
    const lastArg = args[args.length - 1];
    let durationMin = 30;
    let description = fullArgs;

    if (!isNaN(lastArg) && args.length > 1) {
      durationMin = Math.min(Math.max(parseInt(lastArg), 1), 1440); // 1 menit – 24 jam
      description = args.slice(0, -1).join(" ");
    }

    const durationMs = durationMin * 60 * 1000;
    const endTime = Date.now() + durationMs;

    const timer = setTimeout(async () => {
      const r = raffles.get(jid);
      if (r?.active) await endRaffle(sock, jid, r);
    }, durationMs);

    raffles.set(jid, {
      description,
      participants: new Set(),
      host: sender,
      active: true,
      endTime,
      timer,
    });

    await sock.sendMessage(
      jid,
      {
        text: `🎰 *RAFFLE DIMULAI!* 🎰\n\n🎁 Hadiah  : *${description}*\n⏰ Durasi  : *${durationMin} menit*\n🏆 Pemenang: 1 orang\n\n✅ Ketik \`${usedPrefix}raffle join\` untuk ikut!\nℹ️ Info: \`${usedPrefix}raffle info\`\n\nSelamat mencoba! 🍀`,
      },
      { quoted: msg },
    );
  },
};

async function endRaffle(sock, jid, raffle) {
  raffle.active = false;
  raffles.delete(jid);

  if (raffle.participants.size === 0) {
    return sock.sendMessage(jid, {
      text: `🎰 *Raffle Berakhir!*\n\n😢 Tidak ada peserta yang mendaftar.\nHadiah *${raffle.description}* tidak ada pemenangnya.`,
    });
  }

  // Pilih pemenang acak
  const arr = [...raffle.participants];
  const winner = arr[Math.floor(Math.random() * arr.length)];
  const num = getNumber(winner).replace(/:[0-9]+/, "");

  // Jika hadiah berupa koin (ada angka di description)
  const coinMatch = raffle.description.match(/(\d+)\s*koin/i);
  if (coinMatch) {
    const amount = parseInt(coinMatch[1]);
    addCoins(winner, amount);
  }

  await sock.sendMessage(jid, {
    text: `🎉 *RAFFLE SELESAI!* 🎉\n\n🎁 Hadiah: *${raffle.description}*\n👥 Total peserta: *${raffle.participants.size}*\n\n🏆 *PEMENANG:*\n@${num}\n\n🎊 Selamat kepada pemenang! 🎊`,
    mentions: [winner],
  });
}
