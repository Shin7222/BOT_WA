require("dotenv").config();

const config = {
  // ── Identitas Bot ──────────────────────────────
  botName: process.env.BOT_NAME || "MyBot",
  sessionName: process.env.SESSION_NAME || "bot-session",

  // ── Owner & Prefix ─────────────────────────────
  // Dukung semua kode negara: Indonesia 628xxx, Venezuela 584xxx, US 1xxx
  // Bisa multi owner: OWNER_NUMBER=628xxx,628yyy
  ownerNumber: (process.env.OWNER_NUMBER || "245547977990282")
    .split(",")
    .map((n) => n.trim().replace(/\D/g, "")) // strip spasi & non-angka
    .filter(Boolean),
  prefix: (process.env.PREFIX || "!./").split(""),

  // ── Limit System ──────────────────────────────
  limit: {
    user: parseInt(process.env.USER_LIMIT) || 20,
    premium: parseInt(process.env.PREMIUM_LIMIT) || 100,
    owner: Infinity,
  },

  // ── Anti-Ban: Delay ───────────────────────────
  delay: {
    min: parseInt(process.env.SEND_DELAY_MIN) || 1000,
    max: parseInt(process.env.SEND_DELAY_MAX) || 3000,
  },

  // ── Cooldown per command (ms) ─────────────────
  cooldown: (parseInt(process.env.COMMAND_COOLDOWN) || 3) * 1000,

  // ── API Keys ──────────────────────────────────
  openaiKey: process.env.OPENAI_API_KEY || "",
  weatherKey: process.env.WEATHER_API_KEY || "",

  // ── Mode ──────────────────────────────────────
  maintenance: process.env.MAINTENANCE === "true",
  logLevel: process.env.LOG_LEVEL || "info",

  // ── Bot Mode ───────────────────────────────────
  // 'public'  → semua orang bisa pakai, di grup & private
  // 'private' → HANYA merespons di private chat langsung ke nomor bot
  botMode: (process.env.BOT_MODE || "public").toLowerCase(),

  // ── Auto Read ─────────────────────────────────
  // true  → semua pesan masuk otomatis ditandai sudah dibaca (centang biru)
  // false → tidak kirim read receipt
  autoRead: process.env.AUTO_READ !== "false",
};

module.exports = config;
