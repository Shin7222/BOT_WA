"use strict";

const axios = require("axios");

// ── Kategori SFW waifu.pics ──────────────────────────
const WAIFUPICS_CATEGORIES = [
  "waifu",
  "neko",
  "shinobu",
  "megumin",
  "bully",
  "cuddle",
  "cry",
  "hug",
  "awoo",
  "kiss",
  "lick",
  "pat",
  "smug",
  "bonk",
  "yeet",
  "blush",
  "smile",
  "wave",
  "highfive",
  "nom",
  "bite",
  "glomp",
  "slap",
  "happy",
  "wink",
  "poke",
  "dance",
  "cringe",
];

// ── Kategori nekos.moe ───────────────────────────────
const NEKOSMOE_TAGS = [
  "neko",
  "kitsune",
  "holo",
  "maid",
  "uniform",
  "kemonomimi",
  "catgirl",
  "foxgirl",
];

// ── Ambil gambar dari waifu.pics ─────────────────────
async function fromWaifuPics(category) {
  const cat = WAIFUPICS_CATEGORIES.includes(category) ? category : "neko";
  const res = await axios.get(`https://api.waifu.pics/sfw/${cat}`, {
    timeout: 8000,
  });
  return res.data?.url ?? null;
}

// ── Ambil gambar dari nekos.moe (fallback) ───────────
async function fromNekosMoe() {
  const tag = NEKOSMOE_TAGS[Math.floor(Math.random() * NEKOSMOE_TAGS.length)];
  const res = await axios.get(
    `https://nekos.moe/api/v1/random/image?count=1&nsfw=false&tags=${tag}`,
    { timeout: 8000 },
  );
  const file = res.data?.images?.[0]?.id;
  return file ? `https://nekos.moe/image/${file}` : null;
}

module.exports = {
  name: "neko",
  alias: ["anime", "animegambar", "animepic"],
  category: "anime",
  description: "Random gambar anime dari berbagai kategori",
  usage: ".neko [kategori]",
  useLimit: true,
  cooldown: 5000,

  async run({ sock, msg, jid, args }) {
    const category = (args[0] ?? "neko").toLowerCase();

    // Tampilkan daftar kategori
    if (category === "list") {
      const list = WAIFUPICS_CATEGORIES.join(", ");
      return sock.sendMessage(
        jid,
        {
          text: `📋 *Kategori tersedia:*\n\n${list}\n\nContoh: \`.neko hug\``,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

    let imageUrl = null;
    let source = "";

    // Coba waifu.pics dulu
    try {
      imageUrl = await fromWaifuPics(category);
      source = "waifu.pics";
    } catch (_) {
      // fallback ke nekos.moe
    }

    // Fallback ke nekos.moe
    if (!imageUrl) {
      try {
        imageUrl = await fromNekosMoe();
        source = "nekos.moe";
      } catch (err) {
        return sock.sendMessage(
          jid,
          {
            text: "❌ Gagal mengambil gambar. Coba lagi nanti.",
          },
          { quoted: msg },
        );
      }
    }

    const caption = `🌸 *Anime Image*\n📂 Kategori : \`${category}\`\n🔗 Sumber   : ${source}`;

    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      const buf = Buffer.from(res.data);
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } catch {
      // Kalau download gambar gagal, kirim URL saja
      await sock.sendMessage(
        jid,
        {
          text: `${caption}\n\n🔗 ${imageUrl}`,
        },
        { quoted: msg },
      );
    }
  },
};
