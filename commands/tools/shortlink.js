"use strict";

const axios = require("axios");

// Validasi URL sederhana
function isValidUrl(str) {
  try {
    const u = new URL(str.startsWith("http") ? str : "https://" + str);
    return u.hostname.includes(".");
  } catch {
    return false;
  }
}

module.exports = {
  name: "shortlink",
  alias: ["short", "tinyurl", "persingkat"],
  category: "tools",
  description: "Persingkat URL panjang menjadi pendek",
  usage: ".shortlink <url>",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan URL yang ingin dipersingkat!\nContoh: *${usedPrefix}shortlink https://google.com*`,
        },
        { quoted: msg },
      );
    }

    const url = fullArgs.startsWith("http") ? fullArgs : "https://" + fullArgs;

    if (!isValidUrl(url)) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ URL tidak valid! Pastikan URL benar.\nContoh: *${usedPrefix}shortlink https://youtube.com/watch?v=xxx*`,
        },
        { quoted: msg },
      );
    }

    // Coba TinyURL terlebih dahulu
    try {
      const res = await axios.get(`https://tinyurl.com/api-create.php`, {
        params: { url },
        timeout: 8000,
      });

      const shortUrl = res.data?.trim();
      if (!shortUrl || !shortUrl.startsWith("http"))
        throw new Error("Invalid response");

      const text = `🔗 *Short Link*

📥 Asli   : ${url}
📤 Pendek : ${shortUrl}

_Klik link pendek untuk membuka URL asli_`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch {
      // Fallback ke is.gd
      try {
        const res2 = await axios.get("https://is.gd/create.php", {
          params: { format: "simple", url },
          timeout: 8000,
        });
        const shortUrl = res2.data?.trim();

        const text = `🔗 *Short Link*

📥 Asli   : ${url}
📤 Pendek : ${shortUrl}

_Powered by is.gd_`;

        return sock.sendMessage(jid, { text }, { quoted: msg });
      } catch (err2) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Gagal mempersingkat link!\nPastikan URL valid dan coba lagi.`,
          },
          { quoted: msg },
        );
      }
    }
  },
};
