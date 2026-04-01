"use strict";

const { addCoins } = require("../../database/db");

const QUESTIONS = [
  {
    q: "Ibu kota Indonesia adalah?",
    opts: ["Surabaya", "Jakarta", "Bandung", "Medan"],
    ans: 1,
    cat: "🌏 Geografi",
  },
  {
    q: "Planet terbesar di tata surya kita?",
    opts: ["Saturnus", "Neptunus", "Jupiter", "Uranus"],
    ans: 2,
    cat: "🌌 Sains",
  },
  {
    q: "Siapa penemu lampu bohlam?",
    opts: ["Nikola Tesla", "Thomas Edison", "Einstein", "Graham Bell"],
    ans: 1,
    cat: "🔬 Sains",
  },
  {
    q: "Bahasa pemrograman yang dibuat oleh Guido van Rossum?",
    opts: ["Java", "C++", "Python", "Ruby"],
    ans: 2,
    cat: "💻 Teknologi",
  },
  {
    q: "Berapa hasil dari 12 × 12?",
    opts: ["132", "144", "124", "148"],
    ans: 1,
    cat: "🔢 Matematika",
  },
  {
    q: "Negara dengan jumlah penduduk terbanyak di dunia?",
    opts: ["India", "Amerika", "Indonesia", "China"],
    ans: 3,
    cat: "🌏 Geografi",
  },
  {
    q: "Siapa presiden pertama Indonesia?",
    opts: ["Soeharto", "Habibie", "Soekarno", "Wahid"],
    ans: 2,
    cat: "🇮🇩 Sejarah",
  },
  {
    q: "Apa simbol kimia untuk emas?",
    opts: ["Ag", "Fe", "Au", "Cu"],
    ans: 2,
    cat: "🧪 Kimia",
  },
  {
    q: "Berapa jumlah sisi pada segienam?",
    opts: ["5", "7", "6", "8"],
    ans: 2,
    cat: "🔢 Matematika",
  },
  {
    q: "Hewan apa yang dikenal sebagai raja hutan?",
    opts: ["Harimau", "Gajah", "Singa", "Beruang"],
    ans: 2,
    cat: "🦁 Alam",
  },
  {
    q: "Benua terluas di dunia?",
    opts: ["Amerika", "Afrika", "Eropa", "Asia"],
    ans: 3,
    cat: "🌏 Geografi",
  },
  {
    q: 'Siapa yang menulis novel "Laskar Pelangi"?',
    opts: ["Pramoedya", "Andrea Hirata", "Habiburrahman", "Dee Lestari"],
    ans: 1,
    cat: "📚 Sastra",
  },
  {
    q: "Gas apa yang paling banyak di atmosfer bumi?",
    opts: ["Oksigen", "Karbon dioksida", "Nitrogen", "Hidrogen"],
    ans: 2,
    cat: "🌱 Sains",
  },
  {
    q: "Berapa banyak warna dalam pelangi?",
    opts: ["5", "6", "7", "8"],
    ans: 2,
    cat: "🌈 Sains",
  },
  {
    q: "Mata uang Jepang adalah?",
    opts: ["Won", "Yuan", "Yen", "Baht"],
    ans: 2,
    cat: "💱 Ekonomi",
  },
  {
    q: "Siapa pencipta teori relativitas?",
    opts: ["Newton", "Bohr", "Einstein", "Hawking"],
    ans: 2,
    cat: "🔬 Sains",
  },
  {
    q: "Buah apa yang mengandung vitamin C tertinggi?",
    opts: ["Jeruk", "Mangga", "Jambu biji", "Apel"],
    ans: 2,
    cat: "🍎 Kesehatan",
  },
  {
    q: "Bahasa resmi Brazil?",
    opts: ["Spanyol", "Portugis", "Inggris", "Prancis"],
    ans: 1,
    cat: "🌏 Geografi",
  },
  {
    q: '"Hello World" pertama kali dicetak dalam bahasa pemrograman apa?',
    opts: ["Fortran", "COBOL", "B", "Pascal"],
    ans: 2,
    cat: "💻 Teknologi",
  },
  {
    q: "Apa nama sungai terpanjang di dunia?",
    opts: ["Amazon", "Nil", "Yangtze", "Mississippi"],
    ans: 1,
    cat: "🌏 Geografi",
  },
];

const TIMEOUT_MS = 30_000;
const REWARD_COINS = 75;
const LETTERS = ["A", "B", "C", "D"];

const sessions = new Map(); // jid → { question, answer, timer, starter }

module.exports = {
  name: "trivia",
  alias: ["kuis", "quiz"],
  category: "games",
  description: "Kuis pilihan ganda — jawab untuk dapat koin!",
  usage: ".trivia | lalu jawab A/B/C/D",
  useLimit: false,

  async run({ sock, msg, jid, sender, fullArgs, usedPrefix }) {
    // ── Jawab kuis yang sedang berjalan ───────────────
    const ans = fullArgs?.trim().toUpperCase();
    if (ans && LETTERS.includes(ans) && sessions.has(jid)) {
      return handleAnswer(sock, msg, jid, sender, ans, usedPrefix);
    }

    // ── Game sudah berjalan ───────────────────────────
    if (sessions.has(jid)) {
      return sock.sendMessage(
        jid,
        {
          text: `🎯 Kuis masih berlangsung!\nJawab dengan *A / B / C / D*`,
        },
        { quoted: msg },
      );
    }

    // ── Pilih soal acak ───────────────────────────────
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const opts = q.opts.map((o, i) => `${LETTERS[i]}. ${o}`).join("\n");

    const timer = setTimeout(() => {
      if (sessions.has(jid)) {
        const s = sessions.get(jid);
        sessions.delete(jid);
        sock
          .sendMessage(jid, {
            text: `⏰ Waktu habis!\nJawaban yang benar: *${LETTERS[s.answer]}. ${q.opts[s.answer]}*\n\nCoba lagi: *${usedPrefix}trivia*`,
          })
          .catch(() => {});
      }
    }, TIMEOUT_MS);

    sessions.set(jid, { question: q, answer: q.ans, timer, starter: sender });

    await sock.sendMessage(
      jid,
      {
        text: `${q.cat}\n❓ *${q.q}*\n\n${opts}\n\n💰 Hadiah: *${REWARD_COINS} koin*\n⏰ Waktu: *30 detik*\n\n_Jawab dengan A / B / C / D_`,
      },
      { quoted: msg },
    );
  },
};

async function handleAnswer(sock, msg, jid, sender, ans, usedPrefix) {
  const s = sessions.get(jid);
  if (!s) return;

  const idx = LETTERS.indexOf(ans);
  const correct = idx === s.answer;

  clearTimeout(s.timer);
  sessions.delete(jid);

  const correctLabel = `${LETTERS[s.answer]}. ${s.question.opts[s.answer]}`;

  if (correct) {
    addCoins(sender, REWARD_COINS);
    await sock.sendMessage(
      jid,
      {
        text: `✅ *BENAR!*\n\nJawaban: *${correctLabel}*\n💰 +${REWARD_COINS} koin!\n\nSoal berikutnya: *${usedPrefix}trivia*`,
      },
      { quoted: msg },
    );
  } else {
    await sock.sendMessage(
      jid,
      {
        text: `❌ *Salah!*\n\nJawabanmu: *${ans}. ${s.question.opts[idx]}*\nYang benar: *${correctLabel}*\n\nCoba lagi: *${usedPrefix}trivia*`,
      },
      { quoted: msg },
    );
  }
}
