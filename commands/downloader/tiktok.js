"use strict";

const axios = require("axios");

// Regex untuk validasi URL TikTok
const TT_REGEX = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[\w\-@/.?=&%]+/i;

// ── Resolve short URL ke full URL ─────────────────────
async function resolveUrl(url) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
      },
    });
    return res.request.res.responseUrl || url;
  } catch (err) {
    return err.request?.res?.responseUrl || url;
  }
}

// ── Ambil video TikTok via API publik ─────────────────
async function fetchTikTok(url) {
  // Coba tikwm.com API (gratis, tanpa watermark)
  try {
    const res = await axios.post(
      "https://www.tikwm.com/api/",
      new URLSearchParams({ url, hd: 1 }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );
    const d = res.data?.data;
    if (d?.play) {
      return {
        videoUrl: d.hdplay || d.play,
        title: d.title || "TikTok Video",
        author: d.author?.nickname || "Unknown",
        duration: d.duration || 0,
        likes: d.digg_count || 0,
        comments: d.comment_count || 0,
        thumbnail: d.cover || "",
      };
    }
  } catch {
    /* fallback */
  }

  // Fallback: musicaldown API
  const formData = new URLSearchParams({ id: url, locale: "id", tt: "" });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://musicaldown.com",
    Referer: "https://musicaldown.com/",
    "User-Agent": "Mozilla/5.0",
  };

  const page = await axios.get("https://musicaldown.com/id", {
    headers,
    timeout: 10000,
  });
  // Ambil token dari form
  const tokenMatch = page.data.match(/name="tt"\s+value="([^"]+)"/);
  if (tokenMatch) formData.set("tt", tokenMatch[1]);

  const res2 = await axios.post("https://musicaldown.com/download", formData, {
    headers,
    timeout: 15000,
    maxRedirects: 5,
  });

  // Cari link download
  const match = res2.data.match(
    /href="(https:\/\/[^"]*tikcdn[^"]*|https:\/\/[^"]*tiktok[^"]*\.mp4[^"]*)"/i,
  );
  if (!match) throw new Error("Tidak bisa menemukan link download");
  return {
    videoUrl: match[1],
    title: "TikTok Video",
    author: "Unknown",
    duration: 0,
    likes: 0,
    comments: 0,
  };
}

module.exports = {
  name: "tiktok",
  alias: ["tt", "tikdl", "tiktokdl"],
  category: "downloader",
  description: "Download video TikTok tanpa watermark",
  usage: ".tiktok <url>",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs || !TT_REGEX.test(fullArgs)) {
      return sock.sendMessage(
        jid,
        {
          text: `🎵 *TikTok Downloader*\n\nKirim link TikTok untuk download tanpa watermark!\n\nContoh:\n\`${usedPrefix}tiktok https://vt.tiktok.com/xxx\`\n\`${usedPrefix}tiktok https://www.tiktok.com/@user/video/xxx\``,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: "⏳ Mengunduh video TikTok...",
      },
      { quoted: msg },
    );

    // Resolve short URL jika perlu
    const url =
      fullArgs.includes("vm.tiktok") || fullArgs.includes("vt.tiktok")
        ? await resolveUrl(fullArgs)
        : fullArgs;

    let data;
    try {
      data = await fetchTikTok(url);
    } catch (err) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Gagal download TikTok!\n${err.message}\n\nPastikan link valid dan coba lagi.`,
        },
        { quoted: msg },
      );
    }

    // Download buffer video
    const videoRes = await axios.get(data.videoUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.tiktok.com/",
      },
    });

    const buffer = Buffer.from(videoRes.data);

    // Cek ukuran (maks 64MB WhatsApp)
    if (buffer.length > 64 * 1024 * 1024) {
      return sock.sendMessage(
        jid,
        { text: "❌ Video terlalu besar (> 64MB)!" },
        { quoted: msg },
      );
    }

    const caption = `✅ *TikTok Downloaded!*\n\n👤 ${data.author}\n📝 ${data.title.slice(0, 80)}\n❤️ ${Number(data.likes).toLocaleString("id-ID")} likes`;

    await sock.sendMessage(
      jid,
      {
        video: buffer,
        mimetype: "video/mp4",
        caption,
        fileName: "tiktok.mp4",
      },
      { quoted: msg },
    );
  },
};
