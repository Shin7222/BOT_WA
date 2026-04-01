"use strict";

const moment = require("moment");

// Zodiac berdasarkan tanggal lahir
function getZodiac(day, month) {
  const z = [
    [20, 1, "Aquarius", "♒"],
    [19, 2, "Pisces", "♓"],
    [20, 3, "Aries", "♈"],
    [20, 4, "Taurus", "♉"],
    [21, 5, "Gemini", "♊"],
    [21, 6, "Cancer", "♋"],
    [22, 7, "Leo", "♌"],
    [22, 8, "Virgo", "♍"],
    [22, 9, "Libra", "♎"],
    [22, 10, "Scorpio", "♏"],
    [21, 11, "Sagittarius", "♐"],
    [31, 12, "Capricorn", "♑"],
  ];
  for (const [d, m, name, emoji] of z) {
    if (month < m || (month === m && day <= d)) return `${emoji} ${name}`;
  }
  return "♑ Capricorn";
}

// Shio berdasarkan tahun lahir
function getShio(year) {
  const shios = [
    "Tikus🐭",
    "Kerbau🐄",
    "Macan🐯",
    "Kelinci🐰",
    "Naga🐉",
    "Ular🐍",
    "Kuda🐴",
    "Kambing🐑",
    "Monyet🐒",
    "Ayam🐔",
    "Anjing🐕",
    "Babi🐷",
  ];
  return shios[(year - 4) % 12];
}

// Hari dalam bahasa Indonesia
function getDayName(date) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()];
}

module.exports = {
  name: "umur",
  alias: ["age", "ultah", "birthday", "tgl"],
  category: "tools",
  description: "Hitung umur dan info tanggal lahir",
  usage: ".umur <DD-MM-YYYY>  contoh: .umur 17-08-1945",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan tanggal lahir!\n\n*Format yang diterima:*\n• \`${usedPrefix}umur 17-08-2000\`\n• \`${usedPrefix}umur 17/08/2000\`\n• \`${usedPrefix}umur 2000-08-17\``,
        },
        { quoted: msg },
      );
    }

    // Normalisasi format tanggal
    const normalized = fullArgs.replace(/[/\\.]/g, "-");
    const formats = ["DD-MM-YYYY", "YYYY-MM-DD", "D-M-YYYY", "YYYY-M-D"];
    let birthDate = null;

    for (const fmt of formats) {
      const m = moment(normalized, fmt, true);
      if (m.isValid()) {
        birthDate = m;
        break;
      }
    }

    if (!birthDate) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Format tanggal tidak valid!\n\nContoh yang benar:\n• \`${usedPrefix}umur 17-08-2000\`\n• \`${usedPrefix}umur 2000-08-17\``,
        },
        { quoted: msg },
      );
    }

    const now = moment();
    const birth = birthDate.toDate();

    if (birthDate.isAfter(now)) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Tanggal lahir tidak boleh di masa depan!`,
        },
        { quoted: msg },
      );
    }

    // Hitung umur detail
    const years = now.diff(birthDate, "years");
    const months = now.diff(birthDate, "months") % 12;
    const days = now.diff(
      birthDate.clone().add(years, "years").add(months, "months"),
      "days",
    );
    const totalDays = now.diff(birthDate, "days");
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;

    // Ulang tahun berikutnya
    const nextBirthday = birthDate.clone().year(now.year());
    if (nextBirthday.isBefore(now)) nextBirthday.add(1, "year");
    const daysToNext = nextBirthday.diff(now, "days");
    const isTodayBirthday =
      daysToNext === 0 || nextBirthday.diff(now, "days") === 365;

    const zodiac = getZodiac(birth.getDate(), birth.getMonth() + 1);
    const shio = getShio(birth.getFullYear());
    const dayName = getDayName(birth);

    const text = `🎂 *Kalkulator Umur*

📅 Lahir  : ${dayName}, ${birthDate.format("DD MMMM YYYY")}
♋ Zodiak : ${zodiac}
🐉 Shio  : ${shio}

━━━━━━━━━━━━━━
📊 *Umur Sekarang:*
├ ${years} tahun, ${months} bulan, ${days} hari
├ ${totalDays.toLocaleString("id-ID")} hari
├ ${totalWeeks.toLocaleString("id-ID")} minggu
└ ±${totalHours.toLocaleString("id-ID")} jam

🎉 *Ulang Tahun Berikutnya:*
${
  isTodayBirthday
    ? "🥳 Selamat Ulang Tahun! 🎊🎈"
    : `├ ${nextBirthday.format("DD MMMM YYYY")}\n└ ${daysToNext} hari lagi`
}`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
