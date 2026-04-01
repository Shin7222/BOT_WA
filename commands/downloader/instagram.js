"use strict";

const axios = require("axios");

const IG_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i;

// ── Ambil media Instagram via API publik ──────────────
async function fetchInstagram(url) {
  // Normalisasi URL — hapus query string
  const cleanUrl = url.split("?")[0].replace(/\/$/, "");

  // Coba snapinsta.app API (scraping-based, gratis)
  try {
    const formData = new URLSearchParams({ url: cleanUrl, lang: "id" });
    const res = await axios.post("https://snapinsta.app/action.php", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        Origin: "https://snapinsta.app",
        Referer: "https://snapinsta.app/",
      },
      timeout: 15000,
    });

    // Parse HTML response untuk ambil link media
    const html = res.data;
    const videos = [
      ...html.matchAll(/href="(https:\/\/[^"]*\.mp4[^"]*)"/gi),
    ].map((m) => m[1]);
    const images = [
      ...html.matchAll(/src="(https:\/\/[^"]*cdninstagram[^"]*\.jpg[^"]*)"/gi),
    ].map((m) => m[1]);

    if (videos.length) return { type: "video", urls: videos.slice(0, 1) };
    if (images.length) return { type: "image", urls: images.slice(0, 10) };
  } catch {
    /* fallback */
  }

  // Fallback: instasave API
  const res2 = await axios.get(
    `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index`,
    {
      params: { url: cleanUrl },
      headers: {
        "X-RapidAPI-Host":
          "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com",
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
      },
      timeout: 10000,
    },
  );
  const d = res2.data;
  if (d?.media) return { type: "video", urls: [d.media] };
  throw new Error("Tidak bisa mengambil media Instagram");
}

module.exports = {
  name: "instagram",
  alias: ["ig", "igdl", "insta"],
  category: "downloader",
  description: "Download foto atau video dari Instagram",
  usage: ".ig <url post/reel/igtv>",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs || !IG_REGEX.test(fullArgs)) {
      return sock.sendMessage(
        jid,
        {
          text: `📸 *Instagram Downloader*\n\nKirim link post, reel, atau IGTV!\n\nContoh:\n\`${usedPrefix}ig https://www.instagram.com/p/xxx\`\n\`${usedPrefix}ig https://www.instagram.com/reel/xxx\`\n\n⚠️ Pastikan akun tidak di-private!`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: "⏳ Mengambil media Instagram...",
      },
      { quoted: msg },
    );

    let data;
    try {
      data = await fetchInstagram(fullArgs);
    } catch (err) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Gagal mengambil media!\n\nKemungkinan penyebab:\n• Akun private\n• Link tidak valid\n• Post sudah dihapus\n\nError: ${err.message}`,
        },
        { quoted: msg },
      );
    }

    try {
      if (data.type === "video") {
        const res = await axios.get(data.urls[0], {
          responseType: "arraybuffer",
          timeout: 60000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const buffer = Buffer.from(res.data);
        await sock.sendMessage(
          jid,
          {
            video: buffer,
            mimetype: "video/mp4",
            caption: "✅ *Video Instagram*",
            fileName: "instagram.mp4",
          },
          { quoted: msg },
        );
      } else {
        // Foto — bisa multiple (carousel)
        const toSend = data.urls.slice(0, 5); // maks 5 foto
        for (const imgUrl of toSend) {
          try {
            const res = await axios.get(imgUrl, {
              responseType: "arraybuffer",
              timeout: 15000,
              headers: {
                "User-Agent": "Mozilla/5.0",
                Referer: "https://www.instagram.com/",
              },
            });
            await sock.sendMessage(
              jid,
              {
                image: Buffer.from(res.data),
                caption:
                  toSend.length > 1
                    ? `📸 ${toSend.indexOf(imgUrl) + 1}/${toSend.length}`
                    : "✅ *Foto Instagram*",
              },
              { quoted: msg },
            );
            // Delay antar foto
            if (toSend.indexOf(imgUrl) < toSend.length - 1) {
              await new Promise((r) => setTimeout(r, 1000));
            }
          } catch {
            /* skip foto yang gagal */
          }
        }
      }
    } catch (err) {
      await sock.sendMessage(
        jid,
        {
          text: `❌ Gagal mengirim media: ${err.message}`,
        },
        { quoted: msg },
      );
    }
  },
};
