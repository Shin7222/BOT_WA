const config = require("../config");

/**
 * Delay dengan durasi random (anti-ban)
 */
function sleep(min = config.delay.min, max = config.delay.max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kirim pesan dengan delay otomatis (anti-ban)
 */
async function sendWithDelay(sock, jid, content, options = {}) {
  await sleep();
  return sock.sendMessage(jid, content, options);
}

/**
 * Format angka ke format Rupiah
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

/**
 * Format durasi dari milidetik
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} hari ${h % 24} jam`;
  if (h > 0) return `${h} jam ${m % 60} menit`;
  if (m > 0) return `${m} menit ${s % 60} detik`;
  return `${s} detik`;
}

/**
 * Ambil nomor dari JID (contoh: 6281234@s.whatsapp.net → 6281234)
 */
function getNumber(jid) {
  // Baileys kadang format JID sebagai "628xxx:0@s.whatsapp.net"
  // strip semua setelah ':' atau '@' agar dapat nomor bersih
  return jid.replace(/:[0-9]+@.*/g, "").replace(/@.*/g, "");
}

/**
 * Konversi nomor ke JID
 */
function toJID(number) {
  const clean = number.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

/**
 * Cek apakah JID adalah group
 */
function isGroup(jid) {
  return jid.endsWith("@g.us");
}

/**
 * Parse mention dari teks
 */
function parseMention(text) {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
    (v) => v[1] + "@s.whatsapp.net",
  );
}

/**
 * Truncate teks panjang
 */
function truncate(str, max = 100) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

/**
 * Generate random string
 */
function randomString(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

/**
 * Generate random number
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format uptime bot
 */
function formatUptime(ms) {
  return formatDuration(ms);
}

/**
 * Cek prefix dari teks
 */
function getPrefix(text, prefixes) {
  for (const p of prefixes) {
    if (text.startsWith(p)) return p;
  }
  return null;
}

/**
 * Buat progress bar
 */
function progressBar(value, max, length = 10) {
  const filled = Math.round((value / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

module.exports = {
  sleep,
  sendWithDelay,
  formatRupiah,
  formatDuration,
  formatUptime,
  getNumber,
  toJID,
  isGroup,
  parseMention,
  truncate,
  randomString,
  randomInt,
  getPrefix,
  progressBar,
};
