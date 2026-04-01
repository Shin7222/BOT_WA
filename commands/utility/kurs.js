"use strict";

const axios = require("axios");

const CURRENCIES = {
  USD: "🇺🇸 Dollar AS",
  EUR: "🇪🇺 Euro",
  GBP: "🇬🇧 Pound Inggris",
  JPY: "🇯🇵 Yen Jepang",
  SGD: "🇸🇬 Dollar Singapura",
  MYR: "🇲🇾 Ringgit Malaysia",
  SAR: "🇸🇦 Riyal Saudi",
  AUD: "🇦🇺 Dollar Australia",
  CNY: "🇨🇳 Yuan China",
  KRW: "🇰🇷 Won Korea",
  THB: "🇹🇭 Baht Thailand",
  INR: "🇮🇳 Rupee India",
  HKD: "🇭🇰 Dollar HK",
  BTC: "₿ Bitcoin",
  IDR: "🇮🇩 Rupiah",
};

module.exports = {
  name: "kurs",
  alias: ["currency", "valas", "rate"],
  category: "utility",
  description: "Cek kurs mata uang terhadap Rupiah (IDR)",
  usage: ".kurs [kode] [jumlah]  contoh: .kurs USD 100",

  async run({ sock, msg, jid, args, usedPrefix }) {
    const code = args[0]?.toUpperCase();
    const amount = parseFloat(args[1]) || 1;

    // Ambil semua kurs IDR
    const res = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/IDR",
      { timeout: 8000 },
    );
    const rates = res.data?.rates;
    if (!rates) throw new Error("Gagal ambil data kurs");

    // Tampilkan semua kurs jika tidak ada argumen
    if (!code || !rates[code]) {
      const updated = res.data.date;
      const list = Object.entries(CURRENCIES)
        .filter(([c]) => c !== "IDR" && rates[c])
        .map(([c, label]) => {
          const ratePerIdr = rates[c];
          const idrPer1 = (1 / ratePerIdr).toLocaleString("id-ID", {
            maximumFractionDigits: 2,
          });
          return `${label}\n  └ 1 ${c} = *Rp ${idrPer1}*`;
        })
        .join("\n\n");

      return sock.sendMessage(
        jid,
        {
          text: `💱 *Kurs Mata Uang vs IDR*\n📅 Update: ${updated}\n\n${list}\n\n💡 Konversi spesifik:\n\`${usedPrefix}kurs USD 100\` — konversi 100 USD ke IDR`,
        },
        { quoted: msg },
      );
    }

    // Konversi spesifik
    const rateToIdr = 1 / rates[code];
    const result = amount * rateToIdr;
    const label = CURRENCIES[code] || code;
    const formatted = result.toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    });
    const updated = res.data.date;

    await sock.sendMessage(
      jid,
      {
        text: `💱 *Konversi Kurs*\n\n${label}\n\n💵 ${amount.toLocaleString()} ${code}\n💰 = *Rp ${formatted}*\n\n📅 Kurs update: ${updated}\n_Sumber: exchangerate-api.com_`,
      },
      { quoted: msg },
    );
  },
};
