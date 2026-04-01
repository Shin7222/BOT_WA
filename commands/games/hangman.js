"use strict";

const { addCoins } = require("../../database/db");

const WORD_LIST = [
  // Teknologi
  { word: "javascript", hint: "💻 Bahasa pemrograman populer untuk web" },
  { word: "database", hint: "💾 Tempat menyimpan data terstruktur" },
  { word: "algoritma", hint: "🧮 Langkah-langkah untuk memecahkan masalah" },
  { word: "internet", hint: "🌐 Jaringan komputer global" },
  { word: "framework", hint: "🔧 Kerangka kerja pengembangan software" },
  // Alam
  { word: "pelangi", hint: "🌈 Fenomena alam setelah hujan" },
  { word: "gunung", hint: "🏔️ Daratan yang menjulang tinggi" },
  { word: "samudra", hint: "🌊 Lautan yang sangat luas" },
  { word: "hutan", hint: "🌳 Kawasan penuh pepohonan" },
  { word: "volcano", hint: "🌋 Gunung berapi dalam bahasa Inggris" },
  // Hewan
  { word: "gajah", hint: "🐘 Hewan darat terbesar di dunia" },
  { word: "harimau", hint: "🐯 Kucing besar bergaris-garis" },
  { word: "lumba", hint: "🐬 Mamalia laut yang cerdas (lumba-...)" },
  { word: "elang", hint: "🦅 Burung pemangsa bermata tajam" },
  // Makanan
  { word: "rendang", hint: "🍖 Masakan daging khas Minangkabau" },
  { word: "soto", hint: "🍜 Sup khas Indonesia berkuah" },
  { word: "tempe", hint: "🫘 Makanan fermentasi dari kedelai" },
  // Umum
  { word: "merdeka", hint: "🇮🇩 Kata yang berarti bebas / kemerdekaan" },
  { word: "bahasa", hint: "🗣️ Alat komunikasi manusia" },
  { word: "sekolah", hint: "🏫 Tempat belajar formal" },
  { word: "keluarga", hint: "👨‍👩‍👧 Kelompok orang yang memiliki hubungan darah" },
  { word: "semangat", hint: "💪 Dorongan untuk terus maju" },
];

const HANGMAN_ART = [
  "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```",
];

const MAX_WRONG = HANGMAN_ART.length - 1; // 6 nyawa
const REWARD_COINS = 100;
const TIMEOUT_MS = 120_000; // 2 menit

const sessions = new Map();

function buildDisplay(word, guessed) {
  return word
    .split("")
    .map((c) => (guessed.has(c) ? c : "_"))
    .join(" ");
}

module.exports = {
  name: "hangman",
  alias: ["gantung", "tebakkata"],
  category: "games",
  description: "Tebak kata huruf demi huruf sebelum digantung!",
  usage: ".hangman | lalu tebak huruf atau ketik kata",
  useLimit: false,

  async run({ sock, msg, jid, sender, fullArgs, usedPrefix }) {
    const input = fullArgs?.trim().toLowerCase();

    // ── Ada input → coba jawab ────────────────────────
    if (input && sessions.has(jid)) {
      return handleGuess(sock, msg, jid, sender, input, usedPrefix);
    }

    // ── Game sudah berjalan ───────────────────────────
    if (sessions.has(jid)) {
      const s = sessions.get(jid);
      const disp = buildDisplay(s.word, s.guessed);
      return sock.sendMessage(
        jid,
        {
          text: `🎮 Game hangman sedang berjalan!\n\n${HANGMAN_ART[s.wrong]}\n\n📝 Kata: *${disp}*\nHuruf salah: ${[...s.wrongLetters].join(", ") || "-"}\nNyawa: ${"❤️".repeat(MAX_WRONG - s.wrong)}\n\n_Tebak huruf atau kata penuh!_`,
        },
        { quoted: msg },
      );
    }

    // ── Mulai game baru ───────────────────────────────
    const pick = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const word = pick.word;
    const guessed = new Set();
    const wrongLetters = new Set();

    const timer = setTimeout(() => {
      if (sessions.has(jid)) {
        const s = sessions.get(jid);
        sessions.delete(jid);
        sock
          .sendMessage(jid, {
            text: `⏰ Waktu habis!\n\n${HANGMAN_ART[MAX_WRONG]}\n\nKata yang benar: *${s.word}*\n\nCoba lagi: *${usedPrefix}hangman*`,
          })
          .catch(() => {});
      }
    }, TIMEOUT_MS);

    sessions.set(jid, {
      word,
      guessed,
      wrongLetters,
      wrong: 0,
      timer,
      starter: sender,
      hint: pick.hint,
    });

    const display = buildDisplay(word, guessed);

    await sock.sendMessage(
      jid,
      {
        text: `🎮 *HANGMAN!*\n\n${HANGMAN_ART[0]}\n\n📝 Kata: *${display}* (${word.length} huruf)\n💡 Petunjuk: ${pick.hint}\nNyawa: ${"❤️".repeat(MAX_WRONG)}\n\n💰 Hadiah: *${REWARD_COINS} koin*\n\n_Tebak satu huruf atau langsung kata penuh!_`,
      },
      { quoted: msg },
    );
  },
};

async function handleGuess(sock, msg, jid, sender, input, usedPrefix) {
  const s = sessions.get(jid);
  if (!s) return;

  // Tebak kata penuh
  if (input.length > 1) {
    if (input === s.word) {
      clearTimeout(s.timer);
      sessions.delete(jid);
      addCoins(sender, REWARD_COINS);
      return sock.sendMessage(
        jid,
        {
          text: `🎉 *BENAR!*\n\nKata yang benar: *${s.word}*\n💰 +${REWARD_COINS} koin!\n\nCoba lagi: *${usedPrefix}hangman*`,
        },
        { quoted: msg },
      );
    } else {
      s.wrong = Math.min(s.wrong + 2, MAX_WRONG); // hukuman lebih besar untuk tebak kata salah
      if (s.wrong >= MAX_WRONG) {
        clearTimeout(s.timer);
        sessions.delete(jid);
        return sock.sendMessage(
          jid,
          {
            text: `💀 *GAME OVER!*\n\n${HANGMAN_ART[MAX_WRONG]}\n\nKata yang benar: *${s.word}*\n\nCoba lagi: *${usedPrefix}hangman*`,
          },
          { quoted: msg },
        );
      }
      const disp = buildDisplay(s.word, s.guessed);
      return sock.sendMessage(
        jid,
        {
          text: `❌ *${input}* bukan jawabannya!\n\n${HANGMAN_ART[s.wrong]}\n\n📝 Kata: *${disp}*\nNyawa: ${"❤️".repeat(MAX_WRONG - s.wrong)}`,
        },
        { quoted: msg },
      );
    }
  }

  // Tebak satu huruf
  const letter = input[0];

  if (s.guessed.has(letter) || s.wrongLetters.has(letter)) {
    return sock.sendMessage(
      jid,
      {
        text: `ℹ️ Huruf *${letter.toUpperCase()}* sudah pernah ditebak!`,
      },
      { quoted: msg },
    );
  }

  if (s.word.includes(letter)) {
    s.guessed.add(letter);
    const disp = buildDisplay(s.word, s.guessed);
    const solved = !disp.includes("_");

    if (solved) {
      clearTimeout(s.timer);
      sessions.delete(jid);
      addCoins(sender, REWARD_COINS);
      return sock.sendMessage(
        jid,
        {
          text: `🎉 *BERHASIL!*\n\n📝 Kata: *${s.word}*\n💰 +${REWARD_COINS} koin!\n\nCoba lagi: *${usedPrefix}hangman*`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: `✅ Huruf *${letter.toUpperCase()}* ada!\n\n${HANGMAN_ART[s.wrong]}\n\n📝 *${disp}*\nNyawa: ${"❤️".repeat(MAX_WRONG - s.wrong)}\nHuruf salah: ${[...s.wrongLetters].join(", ") || "-"}`,
      },
      { quoted: msg },
    );
  } else {
    s.wrongLetters.add(letter);
    s.wrong++;

    if (s.wrong >= MAX_WRONG) {
      clearTimeout(s.timer);
      sessions.delete(jid);
      return sock.sendMessage(
        jid,
        {
          text: `💀 *GAME OVER!*\n\n${HANGMAN_ART[MAX_WRONG]}\n\nKata yang benar: *${s.word}*\n\nCoba lagi: *${usedPrefix}hangman*`,
        },
        { quoted: msg },
      );
    }

    const disp = buildDisplay(s.word, s.guessed);
    await sock.sendMessage(
      jid,
      {
        text: `❌ Huruf *${letter.toUpperCase()}* tidak ada!\n\n${HANGMAN_ART[s.wrong]}\n\n📝 *${disp}*\nNyawa: ${"❤️".repeat(MAX_WRONG - s.wrong)}\nHuruf salah: ${[...s.wrongLetters].join(", ")}`,
      },
      { quoted: msg },
    );
  }
}
