"use strict";

const axios = require("axios");

const ZODIAC = {
  aries: { emoji: "♈", dates: "21 Mar – 19 Apr" },
  taurus: { emoji: "♉", dates: "20 Apr – 20 Mei" },
  gemini: { emoji: "♊", dates: "21 Mei – 20 Jun" },
  cancer: { emoji: "♋", dates: "21 Jun – 22 Jul" },
  leo: { emoji: "♌", dates: "23 Jul – 22 Agu" },
  virgo: { emoji: "♍", dates: "23 Agu – 22 Sep" },
  libra: { emoji: "♎", dates: "23 Sep – 22 Okt" },
  scorpio: { emoji: "♏", dates: "23 Okt – 21 Nov" },
  sagittarius: { emoji: "♐", dates: "22 Nov – 21 Des" },
  capricorn: { emoji: "♑", dates: "22 Des – 19 Jan" },
  aquarius: { emoji: "♒", dates: "20 Jan – 18 Feb" },
  pisces: { emoji: "♓", dates: "19 Feb – 20 Mar" },
};

// Prediksi lokal jika API down
function generateLocal(sign) {
  const love = [
    "Hari yang baik untuk mengekspresikan perasaan",
    "Komunikasi lancar dengan pasangan",
    "Waktunya introspeksi hubungan",
    "Kejutan menyenangkan menanti",
  ];
  const career = [
    "Peluang baru terbuka hari ini",
    "Fokus pada target utama",
    "Kerjasama tim menghasilkan yang terbaik",
    "Kreativitas sedang di puncaknya",
  ];
  const health = [
    "Jaga asupan air dan istirahat",
    "Energi sedang tinggi, manfaatkan",
    "Luangkan waktu untuk relaksasi",
    "Olahraga ringan sangat dianjurkan",
  ];
  const lucky = [
    Math.floor(Math.random() * 99) + 1,
    Math.floor(Math.random() * 99) + 1,
  ];
  const stars = ["⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    love: pick(love),
    career: pick(career),
    health: pick(health),
    lucky,
    overall: pick(stars),
  };
}

module.exports = {
  name: "horoskop",
  alias: ["horoscope", "zodiak", "ramalan"],
  category: "fun",
  description: "Horoskop harian berdasarkan zodiak",
  usage: ".horoskop <zodiak>  contoh: .horoskop scorpio",
  useLimit: false,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const input = args[0]?.toLowerCase();

    if (!input || !ZODIAC[input]) {
      const list = Object.entries(ZODIAC)
        .map(([k, v]) => `${v.emoji} *${k}* (${v.dates})`)
        .join("\n");
      return sock.sendMessage(
        jid,
        {
          text: `🔮 *Horoskop Harian*\n\nPilih zodiak kamu:\n\n${list}\n\nContoh: \`${usedPrefix}horoskop scorpio\``,
        },
        { quoted: msg },
      );
    }

    const z = ZODIAC[input];
    const now = new Date(Date.now() + 7 * 3600000);
    const date = `${now.getUTCDate()}/${now.getUTCMonth() + 1}/${now.getUTCFullYear()}`;

    let data;

    // Coba API Aztro (gratis)
    try {
      const res = await axios.post(
        `https://aztro.sameerkumar.website/?sign=${input}&day=today`,
        null,
        { timeout: 6000 },
      );
      const d = res.data;
      if (d?.description) {
        data = {
          desc: d.description,
          mood: d.mood || "-",
          color: d.color || "-",
          lucky: [d.lucky_number, d.lucky_time],
          compat: d.compatibility || "-",
        };
      }
    } catch {
      /* fallback */
    }

    // Fallback lokal
    const loc = generateLocal(input);

    const text = data
      ? `${z.emoji} *${input.charAt(0).toUpperCase() + input.slice(1)}*
📅 ${date} | ${z.dates}

📖 *Ramalan Hari Ini:*
${data.desc}

😊 Mood    : ${data.mood}
🎨 Warna   : ${data.color}
💑 Cocok   : ${data.compat}
🍀 Lucky   : ${data.lucky.join(" | ")}`
      : `${z.emoji} *${input.charAt(0).toUpperCase() + input.slice(1)}*
📅 ${date} | ${z.dates}

💕 *Asmara:*
${loc.love}

💼 *Karir:*
${loc.career}

🏃 *Kesehatan:*
${loc.health}

🍀 Angka Hoki  : ${loc.lucky.join(" & ")}
⭐ Rating Hari : ${loc.overall}`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
