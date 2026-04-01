"use strict";

const axios = require("axios");

// Daftar kode bahasa umum
const LANG_MAP = {
  id: "Indonesia",
  en: "Inggris",
  ja: "Jepang",
  ko: "Korea",
  zh: "Mandarin",
  ar: "Arab",
  fr: "Prancis",
  de: "Jerman",
  es: "Spanyol",
  pt: "Portugis",
  ru: "Rusia",
  th: "Thailand",
  vi: "Vietnam",
  ms: "Melayu",
  it: "Italia",
  nl: "Belanda",
  tr: "Turki",
  hi: "Hindi",
  fa: "Persia",
  pl: "Polandia",
};

// Gunakan Google Translate unofficial endpoint (gratis, tanpa API key)
async function translate(text, to = "id", from = "auto") {
  const url = "https://translate.googleapis.com/translate_a/single";
  const res = await axios.get(url, {
    params: {
      client: "gtx",
      sl: from,
      tl: to,
      dt: "t",
      q: text,
    },
    timeout: 10000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const result =
    res.data[0]
      ?.map((item) => item?.[0])
      .filter(Boolean)
      .join("") || "";
  const detectedLang = res.data[2] || from;
  return { result, detectedLang };
}

module.exports = {
  name: "translate",
  alias: ["tr", "terjemah"],
  category: "tools",
  description: "Terjemahkan teks ke bahasa lain",
  usage: ".translate [kode_bahasa] <teks>  |  contoh: .translate en Halo dunia",

  async run({ sock, msg, jid, args, usedPrefix }) {
    if (!args.length) {
      const langList = Object.entries(LANG_MAP)
        .map(([k, v]) => `• \`${k}\` — ${v}`)
        .join("\n");
      return sock.sendMessage(
        jid,
        {
          text: `🌐 *Translate*\n\n*Cara pakai:*\n${usedPrefix}translate [kode] <teks>\n\n*Contoh:*\n• \`${usedPrefix}translate en Halo dunia\`\n• \`${usedPrefix}translate ja Selamat pagi\`\n• \`${usedPrefix}translate id Good morning\`\n\n*Kode bahasa tersedia:*\n${langList}`,
        },
        { quoted: msg },
      );
    }

    // Cek apakah arg pertama adalah kode bahasa
    let targetLang = "id";
    let textToTranslate = args.join(" ");

    if (LANG_MAP[args[0]?.toLowerCase()] || args[0]?.length === 2) {
      targetLang = args[0].toLowerCase();
      textToTranslate = args.slice(1).join(" ");
    }

    if (!textToTranslate.trim()) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan teks yang ingin diterjemahkan!\nContoh: *${usedPrefix}translate en Halo dunia*`,
        },
        { quoted: msg },
      );
    }

    const { result, detectedLang } = await translate(
      textToTranslate,
      targetLang,
    );

    const fromLabel = LANG_MAP[detectedLang] || detectedLang;
    const toLabel = LANG_MAP[targetLang] || targetLang;

    await sock.sendMessage(
      jid,
      {
        text: `🌐 *Translate* ${fromLabel} → ${toLabel}\n\n📥 *Asli:*\n${textToTranslate}\n\n📤 *Hasil:*\n${result}`,
      },
      { quoted: msg },
    );
  },
};
