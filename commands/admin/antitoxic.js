"use strict";

const { getGroup, updateGroup } = require("../../database/db");

// Daftar kata kasar — tambah sesuai kebutuhan
const TOXIC_WORDS = [
  "anjing",
  "anjir",
  "bangsat",
  "babi",
  "kontol",
  "memek",
  "ngentot",
  "tolol",
  "goblok",
  "idiot",
  "bodoh",
  "kampret",
  "bajingan",
  "sialan",
  "brengsek",
  "keparat",
  "tai",
  "taik",
  "asu",
  "jancok",
  "jancuk",
  "cok",
  "cuk",
  "ngewe",
  "ngocok",
  "pepek",
  "ndasmu",
  "matamu",
  "dancok",
];

// Buat regex sekali saja
const TOXIC_REGEX = new RegExp(
  TOXIC_WORDS.map((w) => w.split("").join("[^a-z0-9]*")).join("|"),
  "gi",
);

/**
 * Cek apakah teks mengandung kata kasar
 */
function hasToxicWord(text) {
  TOXIC_REGEX.lastIndex = 0; // reset karena flag g
  return TOXIC_REGEX.test(text.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
}

module.exports = {
  name: "antitoxic",
  alias: ["antikasar", "antiswear"],
  category: "admin",
  description: "Aktifkan/matikan filter kata kasar di group",
  usage: ".antitoxic on/off",
  groupOnly: true,
  adminOnly: true,

  // Fungsi statik agar bisa dipanggil dari event handler
  hasToxicWord,
  TOXIC_WORDS,

  async run({ sock, msg, jid, args, usedPrefix }) {
    const state = args[0]?.toLowerCase();
    const group = getGroup(jid);

    if (!state || !["on", "off"].includes(state)) {
      return sock.sendMessage(
        jid,
        {
          text: `🤬 *Anti Kata Kasar*\n\nStatus: *${group.antitoxic ? "✅ ON" : "❌ OFF"}*\n\n• *${usedPrefix}antitoxic on*  — aktifkan\n• *${usedPrefix}antitoxic off* — matikan\n\nTotal kata terfilter: *${TOXIC_WORDS.length} kata*`,
        },
        { quoted: msg },
      );
    }

    const aktif = state === "on";
    updateGroup(jid, { antitoxic: aktif });

    await sock.sendMessage(
      jid,
      {
        text: `${aktif ? "✅" : "❌"} *Anti Kata Kasar ${aktif ? "Diaktifkan" : "Dimatikan"}*\n\n${aktif ? "Pesan yang mengandung kata kasar akan otomatis dihapus dan pengirim diberi peringatan." : "Filter kata kasar telah dinonaktifkan."}`,
      },
      { quoted: msg },
    );
  },
};
