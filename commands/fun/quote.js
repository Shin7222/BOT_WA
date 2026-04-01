"use strict";

const axios = require("axios");

// Quote motivasi lokal (backup jika API down)
const LOCAL_QUOTES = [
  {
    text: "Jangan pernah menyerah. Hari ini sulit, besok akan lebih sulit, tapi lusa akan penuh sinar matahari.",
    author: "Jack Ma",
  },
  {
    text: "Sukses bukan tentang seberapa banyak uang yang kamu hasilkan, tapi seberapa besar dampak yang kamu berikan.",
    author: "Michelle Obama",
  },
  {
    text: "Orang yang tidak pernah melakukan kesalahan adalah orang yang tidak pernah mencoba hal baru.",
    author: "Albert Einstein",
  },
  {
    text: "Cara terbaik untuk memulai adalah berhenti bicara dan mulai melakukan.",
    author: "Walt Disney",
  },
  {
    text: "Hidup adalah tentang membuat dampak, bukan membuat penghasilan.",
    author: "Kevin Kruse",
  },
  {
    text: "Imajinasi lebih penting dari pengetahuan.",
    author: "Albert Einstein",
  },
  {
    text: "Hidupmu tidak menjadi lebih baik secara kebetulan, itu menjadi lebih baik karena perubahan.",
    author: "Jim Rohn",
  },
  {
    text: "Jika kamu tidak mau mengambil risiko biasa, kamu harus puas dengan kehidupan biasa.",
    author: "Jim Carrey",
  },
];

// Joke lokal
const LOCAL_JOKES = [
  "😂 Kenapa programmer takut di alam terbuka?\nKarena banyak bug!\n\n*— Hadiyanto, tukang ketik*",
  '😂 Apa yang dikatakan 0 ke 8?\n"Ikat pinggangmu bagus sekali!"\n\n*— Matematikawan Planga-plongo*',
  "😂 Kenapa buku matematika selalu sedih?\nKarena penuh masalah!\n\n*— Anonim*",
  '😂 Istri: "Kamu selalu lupain anniversary kita!"\nSuami: "Sayang, itu 404 Not Found di memoriku."\n\n*— Developer yang sudah menikah*',
  "😂 Berapa lama programmer butuh waktu untuk mengganti bohlam?\nTidak bisa, itu masalah hardware!\n\n*— Tech Support Divisi Gelap*",
  "😂 Kenapa ayam menyeberang jalan?\nKarena dia lihat tutorial di YouTube tapi videonya skip-skip!\n\n*— Filosofi Ayam Modern*",
];

module.exports = {
  name: "quote",
  alias: ["quotes", "motivasi", "kata"],
  category: "fun",
  description: "Random quote motivasi atau jokes lucu",
  usage: ".quote [motivasi/joke]",
  useLimit: false,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const type = args[0]?.toLowerCase();

    // ── Jokes ─────────────────────────────────────────
    if (type === "joke" || type === "jokes" || type === "lucu") {
      const joke = LOCAL_JOKES[Math.floor(Math.random() * LOCAL_JOKES.length)];
      return sock.sendMessage(jid, { text: joke }, { quoted: msg });
    }

    // ── Quote Motivasi ────────────────────────────────
    try {
      // API ZenQuotes (gratis)
      const res = await axios.get("https://zenquotes.io/api/random", {
        timeout: 6000,
      });
      const q = res.data?.[0];
      if (q?.q && q?.a) {
        return sock.sendMessage(
          jid,
          {
            text: `💭 *Quote of the Day*\n\n_"${q.q}"_\n\n— *${q.a}*`,
          },
          { quoted: msg },
        );
      }
    } catch {
      /* fallback local */
    }

    // Fallback local quotes
    const q = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    await sock.sendMessage(
      jid,
      {
        text: `💭 *Quote Motivasi*\n\n_"${q.text}"_\n\n— *${q.author}*\n\n💡 Ketik \`${usedPrefix}quote joke\` untuk jokes lucu!`,
      },
      { quoted: msg },
    );
  },
};
