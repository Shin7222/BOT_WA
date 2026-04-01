const config = require('../config');

// Map cooldown per user per command
const cooldowns = new Map();
// Map spam counter per user
const spamCounter = new Map();
// Map user yang sedang diblock sementara
const tempBlocked = new Map();

const SPAM_THRESHOLD = 5;       // Pesan berturut dalam window
const SPAM_WINDOW = 10 * 1000;  // 10 detik
const TEMP_BLOCK_DURATION = 60 * 1000; // 1 menit

/**
 * Cek cooldown command
 * @returns {number} Sisa waktu cooldown (0 = bebas)
 */
function checkCooldown(userId, commandName) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const expiry = cooldowns.get(key) || 0;
  if (now < expiry) return Math.ceil((expiry - now) / 1000);
  cooldowns.set(key, now + config.cooldown);
  return 0;
}

/**
 * Cek apakah user spam
 * @returns {'blocked'|'warned'|false}
 */
function checkSpam(userId) {
  const now = Date.now();

  // Cek block sementara
  const blockedUntil = tempBlocked.get(userId);
  if (blockedUntil) {
    if (now < blockedUntil) return 'blocked';
    tempBlocked.delete(userId);
  }

  const record = spamCounter.get(userId) || { count: 0, firstTime: now };

  // Reset jika sudah di luar window
  if (now - record.firstTime > SPAM_WINDOW) {
    spamCounter.set(userId, { count: 1, firstTime: now });
    return false;
  }

  record.count++;
  spamCounter.set(userId, record);

  if (record.count >= SPAM_THRESHOLD) {
    tempBlocked.set(userId, now + TEMP_BLOCK_DURATION);
    spamCounter.delete(userId);
    return 'blocked';
  }

  if (record.count >= SPAM_THRESHOLD - 1) return 'warned';

  return false;
}

/**
 * Reset cooldown user tertentu (dipakai owner)
 */
function resetCooldown(userId) {
  for (const key of cooldowns.keys()) {
    if (key.startsWith(userId)) cooldowns.delete(key);
  }
  spamCounter.delete(userId);
  tempBlocked.delete(userId);
}

module.exports = { checkCooldown, checkSpam, resetCooldown };
