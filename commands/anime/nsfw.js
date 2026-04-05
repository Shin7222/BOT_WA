import axios from "axios";

export const name = "nsfw";
export const alias = ["anime", "animepic"];
export const category = "anime";
export const description =
  "Mendapatkan gambar anime berdasarkan kategori (Khusus Premium & Owner)";
export const usage = ".nsfw [kategori]";
export const useLimit = true;
export const cooldown = 5000;

/**
 * Daftar kategori resmi dari Nekobot API (NSFW)
 * Pastikan kategori ini sesuai dengan dokumentasi API agar tidak return error
 */
const NEKOBOT_CATEGORIES = [
  "hass",
  "hhentai",
  "hneko",
  "hthigh",
  "paizuri",
  "tentacle",
  "hentai_anal",
  "food",
  "gonewild",
];

/**
 * Fungsi helper untuk mengambil data dari API Nekobot
 */
async function fetchNSFW(type) {
  try {
    const { data } = await axios.get(
      `https://nekobot.xyz/api/image?type=${type}`,
      { timeout: 8000 },
    );
    // API Nekobot mengembalikan URL di dalam properti "message"
    return data.message ?? null;
  } catch (err) {
    console.error("NSFW API Error:", err.message);
    return null;
  }
}

export async function run({ sock, msg, jid, args, isPremium, isOwner }) {
  // --- 1. PROTEKSI AKSES (PREMIUM & OWNER ONLY) ---
  if (!isPremium && !isOwner) {
    return sock.sendMessage(
      jid,
      {
        text: "⭐ Fitur ini hanya untuk *Premium* dan *Owner*!\n\nKetik `.premium` untuk info upgrade.",
      },
      { quoted: msg },
    );
  }

  const input = (args[0] ?? "").toLowerCase();

  // --- 2. LOGIKA LIST KATEGORI ---
  if (input === "list" || !input) {
    const list = NEKOBOT_CATEGORIES.map((v) => `• ${v}`).join("\n");
    return sock.sendMessage(
      jid,
      {
        text: `📋 *Daftar Kategori NSFW:*\n\n${list}\n\nContoh penggunaan:\n\`.nsfw hneko\``,
      },
      { quoted: msg },
    );
  }

  // --- 3. VALIDASI INPUT ---
  if (!NEKOBOT_CATEGORIES.includes(input)) {
    return sock.sendMessage(
      jid,
      {
        text: `❌ Kategori *${input}* tidak ditemukan.\nKetik \`.nsfw list\` untuk melihat daftar.`,
      },
      { quoted: msg },
    );
  }

  // Memberikan reaksi loading agar user tahu bot sedang bekerja
  await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

  // --- 4. EKSEKUSI PENGAMBILAN GAMBAR ---
  const imageUrl = await fetchNSFW(input);

  if (!imageUrl) {
    return sock.sendMessage(
      jid,
      {
        text: "❌ Terjadi kesalahan saat menghubungi server. Mohon coba lagi nanti.",
      },
      { quoted: msg },
    );
  }

  const caption = `🔞 *NSFW Content*\n📂 Kategori: \`${input}\`\n👤 Status: Premium User`;

  // --- 5. PENGIRIMAN HASIL ---
  try {
    await sock.sendMessage(
      jid,
      {
        image: { url: imageUrl },
        caption: caption,
      },
      { quoted: msg },
    );
  } catch (e) {
    // Fallback jika library gagal mendownload gambar otomatis
    await sock.sendMessage(
      jid,
      {
        text: `⚠️ Gagal mengirim gambar secara langsung, silakan gunakan link berikut:\n\n${imageUrl}`,
      },
      { quoted: msg },
    );
  }
}
