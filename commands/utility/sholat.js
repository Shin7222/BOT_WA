"use strict";

const axios = require("axios");

const NAMA_SHOLAT = ["Subuh", "Terbit", "Dzuhur", "Ashar", "Maghrib", "Isya"];
const EMOJI_SHOLAT = ["🌅", "☀️", "🌤️", "🌇", "🌆", "🌙"];

module.exports = {
  name: "sholat",
  alias: ["jadwalsholat", "prayer", "solat"],
  category: "utility",
  description: "Jadwal sholat berdasarkan kota",
  usage: ".sholat <kota>  contoh: .sholat Jakarta",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `🕌 *Jadwal Sholat*\n\nContoh:\n• \`${usedPrefix}sholat Jakarta\`\n• \`${usedPrefix}sholat Surabaya\`\n• \`${usedPrefix}sholat Bandung\``,
        },
        { quoted: msg },
      );
    }

    // Step 1: Geocoding — cari koordinat kota
    const geoRes = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: fullArgs, format: "json", limit: 1 },
        headers: { "User-Agent": "WhatsApp-Bot/1.0" },
        timeout: 8000,
      },
    );

    if (!geoRes.data?.length) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Kota *${fullArgs}* tidak ditemukan!\nCoba gunakan nama kota yang lebih lengkap.`,
        },
        { quoted: msg },
      );
    }

    const { lat, lon, display_name } = geoRes.data[0];
    const cityName = display_name.split(",")[0];

    // Step 2: Jadwal sholat dari Aladhan API
    const now = new Date(Date.now() + 7 * 3600000); // WIB
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const prayRes = await axios.get(
      `https://api.aladhan.com/v1/timings/${day}-${month}-${year}`,
      {
        params: { latitude: lat, longitude: lon, method: 20 }, // method 20 = Kemenag RI
        timeout: 10000,
      },
    );

    const timings = prayRes.data?.data?.timings;
    if (!timings) throw new Error("Gagal ambil jadwal sholat");

    const keys = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const dateStr = `${day}/${month}/${year}`;

    // Cari waktu sholat berikutnya
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    let nextSholat = null;
    keys.forEach((k, i) => {
      if (i === 1) return; // skip Sunrise
      const [h, m] = timings[k].split(":").map(Number);
      const total = h * 60 + m;
      if (!nextSholat && total > nowMinutes) nextSholat = NAMA_SHOLAT[i];
    });

    const rows = keys
      .map((k, i) => {
        const isNext = NAMA_SHOLAT[i] === nextSholat;
        return `${EMOJI_SHOLAT[i]} ${NAMA_SHOLAT[i].padEnd(8)}: *${timings[k]}* ${isNext ? "← sekarang" : ""}`;
      })
      .join("\n");

    await sock.sendMessage(
      jid,
      {
        text: `🕌 *Jadwal Sholat*\n📍 ${cityName}\n📅 ${dateStr} WIB\n\n${rows}\n\n_Metode: Kemenag RI | Sumber: Aladhan API_`,
      },
      { quoted: msg },
    );
  },
};
