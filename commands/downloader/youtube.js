"use strict";

const ytdl = require("@distube/ytdl-core");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");

// ── Cari video YouTube dari query atau URL ────────────
async function resolveVideo(input) {
  // Sudah URL langsung
  if (ytdl.validateURL(input)) return input;

  // Cari via YouTube search API (tidak butuh key)
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(input)}`;
  const res = await axios.get(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 10000,
  });
  const match = res.data.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/);
  if (!match) throw new Error("Video tidak ditemukan");
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

// ── Format durasi detik → mm:ss ────────────────────────
function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

module.exports = {
  name: "yt",
  alias: ["youtube", "ytmp3", "ytmp4", "ytdl"],
  category: "downloader",
  description: "Download YouTube sebagai MP3 atau MP4",
  usage: ".yt mp3 <judul/url> | .yt mp4 <judul/url>",

  async run({ sock, msg, jid, args, usedPrefix }) {
    const type = args[0]?.toLowerCase();
    const query = args.slice(1).join(" ");

    if (!type || !["mp3", "mp4"].includes(type) || !query) {
      return sock.sendMessage(
        jid,
        {
          text: `🎬 *YouTube Downloader*\n\n*Cara pakai:*\n• \`${usedPrefix}yt mp3 <judul/url>\` — audio MP3\n• \`${usedPrefix}yt mp4 <judul/url>\` — video MP4\n\n*Contoh:*\n• \`${usedPrefix}yt mp3 shape of you\`\n• \`${usedPrefix}yt mp4 https://youtu.be/xxx\``,
        },
        { quoted: msg },
      );
    }

    // Kirim status
    await sock.sendMessage(
      jid,
      {
        text: `🔍 Mencari *${query}*...\nMohon tunggu sebentar ⏳`,
      },
      { quoted: msg },
    );

    let url;
    try {
      url = await resolveVideo(query);
    } catch {
      return sock.sendMessage(
        jid,
        { text: "❌ Video tidak ditemukan!" },
        { quoted: msg },
      );
    }

    // Ambil info video
    let info;
    try {
      info = await ytdl.getInfo(url);
    } catch (err) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Gagal mengambil info video!\n${err.message}`,
        },
        { quoted: msg },
      );
    }

    const title = info.videoDetails.title;
    const duration = parseInt(info.videoDetails.lengthSeconds);
    const author = info.videoDetails.author.name;
    const views = parseInt(info.videoDetails.viewCount).toLocaleString("id-ID");

    // Batasi durasi: MP3 maks 15 menit, MP4 maks 10 menit
    const maxDur = type === "mp3" ? 900 : 600;
    if (duration > maxDur) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Video terlalu panjang!\nMaks: *${fmtDuration(maxDur)}* | Video: *${fmtDuration(duration)}*`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      {
        text: `📥 *Mendownload...*\n\n🎵 ${title}\n👤 ${author}\n⏱️ ${fmtDuration(duration)}\n👁️ ${views} views`,
      },
      { quoted: msg },
    );

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(
      tmpDir,
      `yt_${Date.now()}.${type === "mp3" ? "mp3" : "mp4"}`,
    );

    try {
      if (type === "mp3") {
        // Audio only
        await new Promise((resolve, reject) => {
          const stream = ytdl(url, {
            quality: "highestaudio",
            filter: "audioonly",
          });
          const out = fs.createWriteStream(tmpFile);
          stream.pipe(out);
          out.on("finish", resolve);
          out.on("error", reject);
          stream.on("error", reject);
        });

        const buffer = await fs.readFile(tmpFile);
        await sock.sendMessage(
          jid,
          {
            audio: buffer,
            mimetype: "audio/mp4",
            fileName: `${title}.mp3`,
          },
          { quoted: msg },
        );
      } else {
        // Video — pilih kualitas rendah agar cepat dan tidak terlalu besar
        const format = ytdl.chooseFormat(info.formats, {
          quality: "highestvideo",
          filter: (f) => f.container === "mp4" && f.hasAudio && f.hasVideo,
        });

        if (!format) {
          // Fallback: download video+audio terpisah tidak praktis tanpa ffmpeg
          // Pakai format progressive (sudah ada audio)
          await new Promise((resolve, reject) => {
            const stream = ytdl(url, {
              quality: "highest",
              filter: "audioandvideo",
            });
            const out = fs.createWriteStream(tmpFile);
            stream.pipe(out);
            out.on("finish", resolve);
            out.on("error", reject);
            stream.on("error", reject);
          });
        } else {
          await new Promise((resolve, reject) => {
            const stream = ytdl.downloadFromInfo(info, { format });
            const out = fs.createWriteStream(tmpFile);
            stream.pipe(out);
            out.on("finish", resolve);
            out.on("error", reject);
            stream.on("error", reject);
          });
        }

        const stat = await fs.stat(tmpFile);
        // WhatsApp max video 64MB
        if (stat.size > 64 * 1024 * 1024) {
          await fs.remove(tmpFile);
          return sock.sendMessage(
            jid,
            {
              text: "❌ File terlalu besar untuk dikirim via WhatsApp (maks 64MB)!\nCoba gunakan MP3 saja.",
            },
            { quoted: msg },
          );
        }

        const buffer = await fs.readFile(tmpFile);
        await sock.sendMessage(
          jid,
          {
            video: buffer,
            mimetype: "video/mp4",
            fileName: `${title}.mp4`,
            caption: `🎬 *${title}*\n👤 ${author} | ⏱️ ${fmtDuration(duration)}`,
          },
          { quoted: msg },
        );
      }
    } finally {
      await fs.remove(tmpFile).catch(() => {});
    }
  },
};
