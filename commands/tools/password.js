"use strict";

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  number: "0123456789",
  symbol: "!@#$%^&*()-_=+[]{}|;:,.<>?",
};

function generatePassword(length = 16, opts = {}) {
  const use = {
    upper: opts.upper !== false,
    lower: opts.lower !== false,
    number: opts.number !== false,
    symbol: opts.symbol === true,
  };

  // Pastikan minimal 1 karakter dari tiap set yang aktif
  let pool = "";
  let required = [];

  for (const [key, chars] of Object.entries(SETS)) {
    if (use[key]) {
      pool += chars;
      required.push(chars[Math.floor(Math.random() * chars.length)]);
    }
  }

  if (!pool) pool = SETS.lower + SETS.number;

  // Isi sisa panjang
  const rest = Array.from(
    { length: length - required.length },
    () => pool[Math.floor(Math.random() * pool.length)],
  );

  // Acak urutan
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
}

// Hitung kekuatan password
function strength(pass) {
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (pass.length >= 16) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 3) return { label: "Lemah", emoji: "🔴" };
  if (score <= 5) return { label: "Sedang", emoji: "🟡" };
  return { label: "Kuat", emoji: "🟢" };
}

module.exports = {
  name: "password",
  alias: ["pass", "genpass", "passgen"],
  category: "tools",
  description: "Generate password acak yang kuat",
  usage: ".password [panjang] [opsi: -s untuk simbol]",

  async run({ sock, msg, jid, args, usedPrefix }) {
    // Parse argumen
    let length = 16;
    let useSymbol = false;

    for (const arg of args) {
      if (!isNaN(arg)) {
        length = Math.min(Math.max(parseInt(arg), 6), 64); // min 6, max 64
      }
      if (arg === "-s" || arg === "--symbol" || arg === "simbol") {
        useSymbol = true;
      }
    }

    // Generate 3 pilihan password
    const passwords = Array.from({ length: 3 }, () =>
      generatePassword(length, { symbol: useSymbol }),
    );

    const s = strength(passwords[0]);

    const text = `🔐 *Generator Password*

*Panjang* : ${length} karakter
*Simbol*  : ${useSymbol ? "✅ Ya" : "❌ Tidak"}
*Kekuatan*: ${s.emoji} ${s.label}

*Pilihan Password:*
1️⃣ \`${passwords[0]}\`
2️⃣ \`${passwords[1]}\`
3️⃣ \`${passwords[2]}\`

💡 *Tips:*
• Tambah \`-s\` untuk menyertakan simbol
• Tambah angka untuk ubah panjang
  Contoh: \`${usedPrefix}password 24 -s\`

⚠️ _Jangan simpan password di chat!_`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
