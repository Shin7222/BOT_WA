"use strict";

const axios = require("axios");

// ── Quote lokal sebagai fallback ─────────────────────
const LOCAL_QUOTES = [
  {
    quote: "Orang yang tidak bisa menyerah tidak bisa menjadi kuat.",
    character: "Monkey D. Luffy",
    anime: "One Piece",
  },
  {
    quote: "Saya tidak mati untuk teman-teman saya. Saya hidup untuk mereka.",
    character: "Erza Scarlet",
    anime: "Fairy Tail",
  },
  {
    quote: "Jika kamu tidak mau menyerah, itu lebih kuat dari keajaiban.",
    character: "Natsu Dragneel",
    anime: "Fairy Tail",
  },
  {
    quote: "Manusia tidak bisa menang melawan takdir. Tapi kita bisa berjuang.",
    character: "Guts",
    anime: "Berserk",
  },
  {
    quote: "Jangan pernah menyerah pada impianmu!",
    character: "Rock Lee",
    anime: "Naruto",
  },
  {
    quote:
      "Kekuatan sejati bukan soal bertahan hidup. Ini soal melindungi orang-orang penting.",
    character: "Ichigo Kurosaki",
    anime: "Bleach",
  },
  {
    quote:
      "Aku tidak akan membiarkan siapapun mati. Bahkan jika itu membunuhku.",
    character: "Natsu Dragneel",
    anime: "Fairy Tail",
  },
  {
    quote:
      "Hidup bukan hanya tentang menunggu badai berlalu, tapi belajar menari dalam hujan.",
    character: "Violet Evergarden",
    anime: "Violet Evergarden",
  },
  {
    quote: "Mimpi tidak pernah mati. Hanya orang yang menyerah yang mati.",
    character: "Whitebeard",
    anime: "One Piece",
  },
  {
    quote:
      "Setiap manusia punya cahayanya masing-masing yang tidak bisa digantikan.",
    character: "Korosensei",
    anime: "Assassination Classroom",
  },
  {
    quote:
      "Kerja keras mengalahkan bakat ketika bakat tidak mau bekerja keras.",
    character: "Rock Lee",
    anime: "Naruto",
  },
  {
    quote: "Bahkan monster pun menangis ketika mereka terluka.",
    character: "Kaneki Ken",
    anime: "Tokyo Ghoul",
  },
  {
    quote: "Menjadi manusia biasa bukan sesuatu yang memalukan.",
    character: "All Might",
    anime: "My Hero Academia",
  },
  {
    quote:
      "Tidak ada yang bisa menggantikan perasaan menjadi berguna bagi seseorang.",
    character: "Izuku Midoriya",
    anime: "My Hero Academia",
  },
  {
    quote: "Kadang kehilangan adalah cara semesta mengajarkan kita menghargai.",
    character: "Edward Elric",
    anime: "Fullmetal Alchemist",
  },
  {
    quote:
      "Orang yang benar-benar kuat tidak butuh membunuh untuk membuktikannya.",
    character: "Himura Kenshin",
    anime: "Rurouni Kenshin",
  },
  {
    quote: "Tidak ada rasa sakit yang berlangsung selamanya.",
    character: "Zoro",
    anime: "One Piece",
  },
  {
    quote: "Hidup dimulai setelah kopi pagi.",
    character: "Sanji",
    anime: "One Piece",
  },
  {
    quote: "Satu-satunya cara untuk maju adalah dengan terus melangkah.",
    character: "Rimuru Tempest",
    anime: "Tensei Shitara Slime Datta Ken",
  },
  {
    quote:
      "Cinta adalah memberi segalanya bahkan ketika tidak ada yang tersisa.",
    character: "Kaori Miyazono",
    anime: "Your Lie in April",
  },
];

// ── Ambil dari animechan API ─────────────────────────
async function fetchFromAnimechan() {
  const res = await axios.get("https://animechan.io/api/v1/quotes/random", {
    timeout: 8000,
  });
  const d = res.data?.data;
  if (!d) return null;
  return {
    quote: d.content,
    character: d.character?.name ?? "Unknown",
    anime: d.anime?.name ?? "Unknown",
  };
}

// ── Ambil dari animequotes API (fallback 1) ──────────
async function fetchFromQuotable() {
  const res = await axios.get(
    "https://yurippe.vercel.app/api/quotes?random=true",
    { timeout: 8000 },
  );
  const d = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!d?.quote) return null;
  return {
    quote: d.quote,
    character: d.character ?? "Unknown",
    anime: d.anime ?? "Unknown",
  };
}

module.exports = {
  name: "quote",
  alias: ["animequote", "aq", "quoteanime"],
  category: "anime",
  description: "Random quote dari karakter anime",
  usage: ".quote",
  useLimit: true,
  cooldown: 4000,

  async run({ sock, msg, jid }) {
    await sock.sendMessage(jid, { react: { text: "💬", key: msg.key } });

    let result = null;

    // Coba animechan dulu
    try {
      result = await fetchFromAnimechan();
    } catch (_) {}

    // Fallback 1: yurippe API
    if (!result) {
      try {
        result = await fetchFromQuotable();
      } catch (_) {}
    }

    // Fallback 2: quote lokal
    if (!result) {
      result = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
    }

    const text =
      `💬 *Anime Quote*\n` +
      `${"─".repeat(30)}\n\n` +
      `_"${result.quote}"_\n\n` +
      `${"─".repeat(30)}\n` +
      `👤 *${result.character}*\n` +
      `🎌 ${result.anime}`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
