"use strict";

const { addCoins, getUser } = require("../../database/db");
const { formatDuration } = require("../../utils/helper");

// Session aktif per JID (bisa group & private)
const sessions = new Map();

const TIMEOUT_MS = 60_000; // 60 detik
const REWARD_COINS = 50;

module.exports = {
  name: "tebakangka",
  alias: ["angka", "numberguess"],
  category: "games",
  description: "Tebak angka yang dipilih bot (1-100)",
  usage: ".tebakangka | lalu balas angka",
  useLimit: false,

  async run({ sock, msg, jid, sender, fullArgs, usedPrefix }) {
    // ── Jika ada angka di fullArgs → coba jawab ───────
    const guess = parseInt(fullArgs);
    if (!isNaN(guess) && sessions.has(jid)) {
      return handleGuess(sock, msg, jid, sender, guess, usedPrefix);
    }

    // ── Mulai game baru ───────────────────────────────
    if (sessions.has(jid)) {
      const s = sessions.get(jid);
      return sock.sendMessage(
        jid,
        {
          text: `🎮 Game sudah berjalan!\nKisaran: 1–100 | Sisa waktu: ${formatDuration(TIMEOUT_MS - (Date.now() - s.startedAt))}\n\n_Balas dengan angka tebakanmu!_`,
        },
        { quoted: msg },
      );
    }

    const answer = Math.floor(Math.random() * 100) + 1;
    const attempts = Math.floor(Math.random() * 3) + 5; // 5–7 kesempatan

    const timer = setTimeout(() => {
      if (sessions.has(jid)) {
        const s = sessions.get(jid);
        sessions.delete(jid);
        sock
          .sendMessage(jid, {
            text: `⏰ Waktu habis! Jawabannya adalah *${s.answer}*.\nCoba lagi dengan *${usedPrefix}tebakangka*`,
          })
          .catch(() => {});
      }
    }, TIMEOUT_MS);

    sessions.set(jid, {
      answer,
      attempts,
      used: 0,
      startedAt: Date.now(),
      timer,
      starter: sender,
    });

    await sock.sendMessage(
      jid,
      {
        text: `🎯 *Tebak Angka!*\n\nAku memikirkan angka antara *1 – 100*\nKamu punya *${attempts} kesempatan*\nWaktu: *60 detik*\n\n💰 Hadiah: *${REWARD_COINS} koin* jika benar!\n\n_Balas dengan angka tebakanmu!_`,
      },
      { quoted: msg },
    );
  },
};

async function handleGuess(sock, msg, jid, sender, guess, usedPrefix) {
  const s = sessions.get(jid);
  if (!s) return;

  if (guess < 1 || guess > 100) {
    return sock.sendMessage(
      jid,
      { text: "❌ Angka harus antara 1–100!" },
      { quoted: msg },
    );
  }

  s.used++;
  const remaining = s.attempts - s.used;

  if (guess === s.answer) {
    clearTimeout(s.timer);
    sessions.delete(jid);
    addCoins(sender, REWARD_COINS);
    return sock.sendMessage(
      jid,
      {
        text: `🎉 *BENAR!*\n\nAngkanya memang *${s.answer}*!\nDitebak dalam *${s.used}* percobaan\n\n💰 +${REWARD_COINS} koin berhasil didapat!`,
      },
      { quoted: msg },
    );
  }

  if (remaining <= 0) {
    clearTimeout(s.timer);
    sessions.delete(jid);
    return sock.sendMessage(
      jid,
      {
        text: `😭 *Kesempatan habis!*\n\nJawabannya adalah *${s.answer}*\nTebakanmu: *${guess}*\n\nCoba lagi: *${usedPrefix}tebakangka*`,
      },
      { quoted: msg },
    );
  }

  const hint = guess < s.answer ? "📈 Terlalu kecil!" : "📉 Terlalu besar!";
  await sock.sendMessage(
    jid,
    {
      text: `${hint}\nTebakan: *${guess}*\nKesempatan tersisa: *${remaining}*`,
    },
    { quoted: msg },
  );
}
