"use strict";

const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");

// ── Konversi gambar ke WebP (format sticker WA) ────────
async function imageToWebp(buffer) {
  // Coba pakai sharp jika tersedia
  try {
    const sharp = require("sharp");
    return await sharp(buffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // Fallback: pakai jimp untuk resize, kirim sebagai-is
    try {
      const { Jimp } = require("jimp");
      const img = await Jimp.read(buffer);
      img.resize({ w: 512, h: 512 });
      return await img.getBuffer("image/png");
    } catch {
      return buffer;
    }
  }
}

// ── Tambah metadata sticker (pack name & author) ───────
function addStickerMetadata(buffer, packname = "", author = "") {
  // Encode metadata ke EXIF-like untuk WA sticker
  const json = JSON.stringify({
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
  });
  const meta = Buffer.from(json);

  // RIFF WebP header check
  if (buffer.length < 12) return buffer;

  // Tambah EXIF chunk ke WebP (simplified)
  // Format: RIFF[size]WEBP[EXIF[size][data]]
  try {
    const exifHeader = Buffer.from("EXIF");
    const exifSize = Buffer.alloc(4);
    exifSize.writeUInt32LE(meta.length, 0);
    return Buffer.concat([buffer, exifHeader, exifSize, meta]);
  } catch {
    return buffer;
  }
}

module.exports = {
  name: "sticker",
  alias: ["stiker", "s", "stkr"],
  category: "downloader",
  description: "Buat sticker dari gambar yang dikirim/di-reply",
  usage: ".sticker [nama | nama | author] — reply/kirim gambar",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    const msgContent = msg.message;

    // ── Tentukan sumber gambar ─────────────────────────
    // 1. Gambar dikirim langsung bersamaan dengan command
    // 2. Reply ke gambar/sticker
    let imgBuffer = null;
    let isAnimated = false;

    const quoted = msgContent?.extendedTextMessage?.contextInfo?.quotedMessage;

    const mediaMsg =
      msgContent?.imageMessage ||
      msgContent?.stickerMessage ||
      quoted?.imageMessage ||
      quoted?.stickerMessage ||
      quoted?.videoMessage ||
      msgContent?.videoMessage;

    if (!mediaMsg) {
      return sock.sendMessage(
        jid,
        {
          text: `🖼️ *Sticker Maker*\n\n*Cara pakai:*\n1. Kirim gambar dengan caption *${usedPrefix}sticker*\n2. Atau reply gambar lalu ketik *${usedPrefix}sticker*\n\n*Opsional nama:*\n\`${usedPrefix}sticker NamaPack | NamaAuthor\``,
        },
        { quoted: msg },
      );
    }

    // Download media
    try {
      const { downloadMediaMessage } = require("@whiskeysockets/baileys");
      const buf = await downloadMediaMessage(
        {
          message:
            msgContent?.imageMessage || msgContent?.videoMessage
              ? msg
              : {
                  message: quoted,
                  key: msg.message.extendedTextMessage.contextInfo,
                },
          key: msg.key,
        },
        "buffer",
        {},
      );
      imgBuffer = buf;
      isAnimated = !!mediaMsg.gifPlayback || mediaMsg.mimetype?.includes("gif");
    } catch {
      // Fallback download manual via URL
      try {
        const { downloadMediaMessage } = require("@whiskeysockets/baileys");
        const targetMsg = quoted
          ? {
              message: quoted,
              key: {
                ...msg.key,
                id: msg.message?.extendedTextMessage?.contextInfo?.stanzaId,
              },
            }
          : msg;
        imgBuffer = await downloadMediaMessage(targetMsg, "buffer", {});
      } catch (err2) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Gagal mengambil gambar!\n${err2.message}`,
          },
          { quoted: msg },
        );
      }
    }

    // Parse nama sticker dari args
    const parts = fullArgs ? fullArgs.split("|") : [];
    const packname = parts[0]?.trim() || process.env.BOT_NAME || "Bot";
    const author = parts[1]?.trim() || "Made with ❤️";

    await sock.sendMessage(
      jid,
      { text: "⏳ Membuat sticker..." },
      { quoted: msg },
    );

    // Konversi ke WebP
    const webpBuffer = await imageToWebp(imgBuffer);

    // Kirim sebagai sticker
    await sock.sendMessage(
      jid,
      {
        sticker: webpBuffer,
        isAnimated,
        stickerName: packname,
        stickerAuthor: author,
      },
      { quoted: msg },
    );
  },
};
