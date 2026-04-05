"use strict";

const axios = require("axios");

// ── Hari dalam bahasa Indonesia ──────────────────────
const HARI = {
  mondays: "Senin",
  tuesdays: "Selasa",
  wednesdays: "Rabu",
  thursdays: "Kamis",
  fridays: "Jumat",
  saturdays: "Sabtu",
  sundays: "Minggu",
  other: "Lainnya",
};

const HARI_KEYS = Object.keys(HARI);

// ── Ambil jadwal dari Jikan v4 ───────────────────────
async function fetchSchedule(filter) {
  const url = filter
    ? `https://api.jikan.moe/v4/schedules?filter=${filter}&limit=10`
    : `https://api.jikan.moe/v4/schedules?limit=25`;
  const res = await axios.get(url, { timeout: 10000 });
  return res.data?.data ?? [];
}

module.exports = {
  name: "jadwalanime",
  alias: ["animejadwal", "jadwal", "airing"],
  category: "anime",
  description: "Jadwal anime yang sedang tayang musim ini",
  usage: ".jadwalanime [hari]\nContoh: .jadwalanime senin",
  useLimit: true,
  cooldown: 8000,

  async run({ sock, msg, jid, args }) {
    const input = (args[0] ?? "").toLowerCase();

    // Tampilkan daftar hari
    if (input === "list" || input === "hari") {
      const list = Object.values(HARI).join(", ");
      return sock.sendMessage(
        jid,
        {
          text: `📅 *Filter hari tersedia:*\n${list}\n\nContoh: \`.jadwalanime senin\`\nTanpa filter: \`.jadwalanime\` (tampil semua)`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(jid, { react: { text: "📅", key: msg.key } });

    // Mapping input bahasa Indonesia → key Jikan
    const hariMap = {
      senin: "mondays",
      selasa: "tuesdays",
      rabu: "wednesdays",
      kamis: "thursdays",
      jumat: "fridays",
      sabtu: "saturdays",
      minggu: "sundays",
      // english juga diterima
      monday: "mondays",
      tuesday: "tuesdays",
      wednesday: "wednesdays",
      thursday: "thursdays",
      friday: "fridays",
      saturday: "saturdays",
      sunday: "sundays",
    };

    const filterKey = hariMap[input] ?? null;

    let data = [];
    try {
      data = await fetchSchedule(filterKey);
    } catch (err) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ Gagal mengambil data jadwal. Coba lagi nanti.",
        },
        { quoted: msg },
      );
    }

    if (!data.length) {
      return sock.sendMessage(
        jid,
        {
          text: "📭 Tidak ada jadwal ditemukan untuk hari ini.",
        },
        { quoted: msg },
      );
    }

    // Kelompokkan per hari
    const grouped = {};
    for (const anime of data) {
      const day = anime.broadcast?.day?.toLowerCase() ?? "other";
      const key =
        HARI_KEYS.find((k) => day.includes(k.replace(/s$/, ""))) ?? "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(anime);
    }

    // Build pesan
    let text = `📅 *Jadwal Anime Musim Ini*`;
    if (filterKey) text += ` — ${HARI[filterKey]}`;
    text += "\n" + "─".repeat(30) + "\n";

    for (const key of HARI_KEYS) {
      const list = grouped[key];
      if (!list?.length) continue;

      text += `\n🗓️ *${HARI[key]}*\n`;
      for (const anime of list.slice(0, 8)) {
        const ep = anime.episodes ? `(${anime.episodes} ep)` : "";
        const score = anime.score ? `⭐ ${anime.score}` : "";
        const time = anime.broadcast?.time ?? "??:??";
        text += `  • *${anime.title}* ${ep}\n`;
        text += `    🕐 ${time} JST  ${score}\n`;
      }
    }

    text += "\n─".repeat(30);
    text += "\n📡 Data dari MyAnimeList via Jikan API";

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
