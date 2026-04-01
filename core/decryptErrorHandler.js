/**
 * core/decryptErrorHandler.js
 * ─────────────────────────────────────────────────────
 * Menangani error "Bad MAC" / "Failed to decrypt" dari
 * Baileys + libsignal agar tidak membanjiri log terminal.
 *
 * Root cause "Bad MAC":
 *   1. getMessage() mengembalikan undefined  → fixed di auth.js
 *   2. Pre-key / session key tidak sinkron   → auto-reset di sini
 *   3. Pesan dikirim sebelum session siap    → diabaikan di handler.js
 *
 * Solusi yang diterapkan di file ini:
 *   • Patch process.stderr untuk menyaring pesan noise
 *   • Counter: jika Bad MAC terjadi > threshold → trigger re-register keys
 * ─────────────────────────────────────────────────────
 */

"use strict";

const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────
// Konstanta
// ─────────────────────────────────────────────────────

// Kata kunci yang harus di-suppress dari stderr & stdout
const SUPPRESS_PATTERNS = [
  // Signal Protocol / decrypt errors
  "Bad MAC",
  "Failed to decrypt",
  "decrypt message with any known session",
  "Session error",
  "Bad session",
  "verifyMAC",
  "doDecryptWhisperMessage",
  // Session lifecycle noise (normal, bukan error)
  "Closing open session in favor of incoming prekey bundle",
  "Closing session: SessionEntry",
  "SessionEntry {",
  "_chains:",
  "registrationId:",
  "currentRatchet:",
  "ephemeralKeyPair:",
  "lastRemoteEphemeralKey:",
  "previousCounter:",
  "rootKey:",
  "indexInfo:",
  "baseKey:",
  "baseKeyType:",
  "remoteIdentityKey:",
  "chainKey:",
  "chainType:",
  "messageKeys:",
  "pubKey: <Buffer",
  "privKey: <Buffer",
];

// Setelah N error Bad MAC berturut-turut, paksa re-register pre-keys
const REREGISTER_THRESHOLD = 10;

// ─────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────

let badMacCount = 0;
let lastResetTime = Date.now();
let sockRef = null; // referensi socket aktif, diisi dari luar

// ─────────────────────────────────────────────────────
// Patch stderr — sembunyikan baris noise dari libsignal
// ─────────────────────────────────────────────────────

const _origStderrWrite = process.stderr.write.bind(process.stderr);

// Suppress juga dari stdout (console.log Baileys)
const _origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function (chunk, encoding, callback) {
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
  if (SUPPRESS_PATTERNS.some((p) => text.includes(p))) {
    if (typeof callback === "function") callback();
    return true;
  }
  return _origStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = function (chunk, encoding, callback) {
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");

  const isBadMac = SUPPRESS_PATTERNS.some((p) => text.includes(p));

  if (isBadMac) {
    // Hitung dan catat secara internal, tapi jangan tampilkan ke terminal
    badMacCount++;

    // Reset counter tiap 60 detik
    if (Date.now() - lastResetTime > 60_000) {
      badMacCount = 1;
      lastResetTime = Date.now();
    }

    // Log ringkas sekali per burst agar tidak benar-benar silent
    if (badMacCount === 1 || badMacCount % 20 === 0) {
      logger.warn(
        `[DecryptError] Bad MAC x${badMacCount} — pesan dilewati (normal jika sesekali).`,
      );
    }

    // Jika terlalu banyak, coba perbaiki pre-keys
    if (badMacCount >= REREGISTER_THRESHOLD) {
      handleHighBadMacRate();
    }

    // Selesai — jangan tulis ke stderr
    if (typeof callback === "function") callback();
    return true;
  }

  return _origStderrWrite(chunk, encoding, callback);
};

// ─────────────────────────────────────────────────────
// Handler jika Bad MAC terlalu sering
// ─────────────────────────────────────────────────────

let reregisterCooldown = false;

async function handleHighBadMacRate() {
  if (reregisterCooldown) return;
  reregisterCooldown = true;

  logger.warn(
    "[DecryptError] Bad MAC rate tinggi. Mencoba re-register pre-keys...",
  );

  try {
    if (sockRef && typeof sockRef.uploadPreKeys === "function") {
      await sockRef.uploadPreKeys();
      logger.success("[DecryptError] Pre-keys berhasil di-upload ulang.");
      badMacCount = 0;
    } else {
      logger.warn(
        "[DecryptError] Socket tidak tersedia untuk re-register keys.",
      );
    }
  } catch (err) {
    logger.error("[DecryptError] Gagal re-register keys:", err.message);
  }

  // Cooldown 5 menit sebelum boleh re-register lagi
  setTimeout(() => {
    reregisterCooldown = false;
  }, 5 * 60_000);
}

// ─────────────────────────────────────────────────────
// API publik
// ─────────────────────────────────────────────────────

/**
 * Daftarkan socket aktif agar bisa upload pre-keys saat diperlukan.
 * Panggil ini dari index.js saat bot berhasil connect.
 *
 * @param {object} sock — socket Baileys aktif
 */
function registerSocket(sock) {
  sockRef = sock;
}

/**
 * Reset counter Bad MAC (opsional, bisa dipanggil setelah reconnect).
 */
function resetCounter() {
  badMacCount = 0;
  lastResetTime = Date.now();
}

module.exports = { registerSocket, resetCounter };
