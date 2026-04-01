"use strict";

const axios = require("axios");

module.exports = {
  name: "libur",
  alias: ["holiday", "harilibur", "tanggalmerah"],
  category: "utility",
  description: "Cek hari libur nasional Indonesia",
  usage: ".libur [bulan/tahun]  contoh: .libur 12/2025",

  async run({ sock, msg, jid, args, usedPrefix }) {
    const now = new Date(Date.now() + 7 * 3600000);
    let year = now.getUTCFullYear();
    let month = null;

    // Parse argumen: bisa "12/2025", "12", atau "2025"
    if (args[0]) {
      if (args[0].includes("/")) {
        const parts = args[0].split("/");
        month = parseInt(parts[0]);
        year = parseInt(parts[1]) || year;
      } else if (parseInt(args[0]) > 12) {
        year = parseInt(args[0]);
      } else {
        month = parseInt(args[0]);
      }
    }

    // API Hari Libur Indonesia — github.com/guangrei/APIHariLibur
    let data;
    try {
      const res = await axios.get(`https://api-harilibur.vercel.app/api`, {
        params: year ? { year } : {},
        timeout: 10000,
      });
      data = res.data;
    } catch {
      // Fallback API
      const res2 = await axios.get(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`,
        { timeout: 10000 },
      );
      data = res2.data?.map((h) => ({
        holiday_date: h.date,
        holiday_name: h.localName || h.name,
        is_national_holiday: true,
      }));
    }

    if (!data?.length) {
      return sock.sendMessage(
        jid,
        { text: `❌ Data hari libur tahun ${year} tidak tersedia.` },
        { quoted: msg },
      );
    }

    // Filter bulan jika ada
    let filtered = data.filter((h) => h.is_national_holiday !== false);
    if (month) {
      filtered = filtered.filter((h) => {
        const m = parseInt(h.holiday_date?.split("-")[1]);
        return m === month;
      });
    }

    if (!filtered.length) {
      return sock.sendMessage(
        jid,
        {
          text: `📅 Tidak ada hari libur nasional ${month ? `bulan ${month}/` : ""}${year}.`,
        },
        { quoted: msg },
      );
    }

    const NAMA_BULAN = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    // Group by bulan
    const grouped = {};
    filtered.forEach((h) => {
      const [y, m, d] = h.holiday_date.split("-");
      const key = `${NAMA_BULAN[parseInt(m)]} ${y}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(`  📌 ${d} — ${h.holiday_name}`);
    });

    const list = Object.entries(grouped)
      .map(([bulan, days]) => `*${bulan}*\n${days.join("\n")}`)
      .join("\n\n");

    const title = month
      ? `Hari Libur ${NAMA_BULAN[month]} ${year}`
      : `Hari Libur Nasional ${year}`;

    await sock.sendMessage(
      jid,
      {
        text: `🗓️ *${title}*\nTotal: ${filtered.length} hari\n\n${list}\n\n💡 Filter: \`${usedPrefix}libur 12/2025\``,
      },
      { quoted: msg },
    );
  },
};
