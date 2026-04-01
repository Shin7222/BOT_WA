"use strict";

const { getBotStats, getUser } = require("../../database/db");
const { formatUptime, progressBar } = require("../../utils/helper");
const config = require("../../config");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

function getSalam() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  const hour = wib.getUTCHours();
  if (hour >= 4 && hour < 11) return "Selamat Pagi ☀️";
  if (hour >= 11 && hour < 15) return "Selamat Siang 🌤️";
  if (hour >= 15 && hour < 18) return "Selamat Sore 🌇";
  return "Selamat Malam 🌙";
}

function getWIBTime() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const m = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m} WIB`;
}

async function getMenuImage() {
  const local = path.join(__dirname, "..", "..", "assets", "menu.jpg");
  if (await fs.pathExists(local)) return fs.readFile(local);
  const url = process.env.MENU_IMAGE_URL;
  if (url) {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
    });
    return Buffer.from(res.data);
  }
  return null;
}

module.exports = {
  name: "menu",
  alias: ["help", "start"],
  category: "tools",
  description: "Menampilkan menu utama bot",
  usage: ".menu",
  useLimit: false,
  cooldown: 5000,

  async run({
    sock,
    msg,
    jid,
    usedPrefix,
    isOwner,
    isPremium,
    userData,
    senderNumber,
  }) {
    const stats = getBotStats();
    const uptime = formatUptime(process.uptime() * 1000);
    const user = userData;
    const level = user.level || 1;
    const exp = user.exp || 0;
    const nextExp = Math.pow(level * 10, 2);
    const bar = progressBar(exp % nextExp, nextExp, 8);
    const role = isOwner ? "👑 Owner" : isPremium ? "⭐ Premium" : "👤 User";
    const botName = process.env.BOT_NAME || "MyBot";
    const salam = getSalam();
    const waktu = getWIBTime();
    const mode = config.botMode === "private" ? "🔒 Private" : "🌐 Public";
    const p = usedPrefix;

    const caption = `${salam}, @${senderNumber}!
🕐 ${waktu}

╭━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${botName}*
╰━━━━━━━━━━━━━━━━━━━━╯

🎭 ${role}  •  Lv.${level}  ${bar}
💰 ${(user.coins || 0).toLocaleString("id-ID")} koin  •  Limit ${user.usedLimit}/${isPremium ? 100 : 20}

━━━━ 🛠️ *TOOLS* ━━━━
│ ${p}calc       — Kalkulator
│ ${p}cuaca      — Cek cuaca kota
│ ${p}translate  — Terjemahkan teks
│ ${p}shortlink  — Persingkat URL
│ ${p}password   — Generate password
│ ${p}umur       — Hitung umur / zodiak
│ ${p}qr         — Buat QR code
│ ${p}limit      — Cek limit harian

━━━━ 🎮 *GAMES* ━━━━
│ ${p}tebakangka — Tebak angka 1–100
│ ${p}suit       — Batu gunting kertas
│ ${p}slot       — Slot machine 🎰
│ ${p}trivia     — Kuis pilihan ganda
│ ${p}hangman    — Tebak kata

━━━━ 📥 *DOWNLOADER* ━━━━
│ ${p}yt mp3/mp4 — YouTube
│ ${p}tiktok     — TikTok no watermark
│ ${p}ig         — Instagram foto/video
│ ${p}sticker    — Buat sticker

━━━━ 💰 *ECONOMY* ━━━━
│ ${p}daily      — Klaim koin harian
│ ${p}transfer   — Transfer koin
│ ${p}leaderboard— Top koin/level
│ ${p}toko       — Toko item virtual
│ ${p}rampok     — Rampok koin user

━━━━ 👥 *SOSIAL* ━━━━
│ ${p}profil     — Lihat profil user
│ ${p}badge      — Koleksi badge
│ ${p}hadiah     — Kirim koin ke user
│ ${p}nikah      — Marriage system 💍

━━━━ 🎉 *FUN* ━━━━
│ ${p}quote      — Quote motivasi/jokes
│ ${p}horoskop   — Ramalan zodiak harian

━━━━ 🔧 *UTILITY* ━━━━
│ ${p}resep      — Cari resep masakan
│ ${p}kurs       — Kurs mata uang
│ ${p}sholat     — Jadwal sholat
│ ${p}libur      — Hari libur nasional

━━━━ 👥 *GROUP* ━━━━
│ ${p}welcome    — Pesan sambutan
│ ${p}antitoxic  — Filter kata kasar
│ ${p}aktivitas  — Statistik group
│ ${p}polling    — Voting di group
│ ${p}raffle     — Giveaway/undian
│ ${p}kick       — Keluarkan member

━━━━ ⚙️ *ADMIN BOT* ━━━━
│ ${p}broadcast  — Kirim ke semua user
│ ${p}botmode    — Ganti mode bot
│ ${p}maintenance— Mode maintenance
│ ${p}backup     — Backup database
│ ${p}set        — Edit level/koin user
│ ${p}stats      — Statistik bot
│ ${p}shutdown   — Matikan bot

━━━━━━━━━━━━━━━━━━━━
👥 Users: *${stats.totalUsers}*  ⭐ Premium: *${stats.totalPremium}*
🌐 Mode: *${mode}*  ⏱️ Uptime: *${uptime}*
━━━━━━━━━━━━━━━━━━━━`.trim();

    const mentions = [`${senderNumber}@s.whatsapp.net`];

    try {
      const img = await getMenuImage();
      if (img) {
        await sock.sendMessage(
          jid,
          {
            image: img,
            caption,
            mentions,
            contextInfo: {
              externalAdReply: {
                title: botName,
                body: `${salam} • ${waktu}`,
                mediaType: 1,
                thumbnail: img,
                sourceUrl: process.env.MENU_LINK_URL || "https://youtube.com",
                renderLargerThumbnail: true,
                showAdAttribution: false,
              },
            },
          },
          { quoted: msg },
        );
      } else {
        await sock.sendMessage(
          jid,
          { text: caption, mentions },
          { quoted: msg },
        );
      }
    } catch {
      await sock.sendMessage(jid, { text: caption, mentions }, { quoted: msg });
    }
  },
};
