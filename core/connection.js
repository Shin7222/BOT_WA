/**
 * core/connection.js
 * ─────────────────────────────────────────────────────
 * Layer di atas auth.js — mengurus:
 *   • State koneksi global
 *   • Health-check berkala
 *   • Graceful shutdown
 *   • Akses socket dari mana saja
 * ─────────────────────────────────────────────────────
 */

'use strict';

const chalk  = require('chalk');
const logger = require('../utils/logger');

// ── State koneksi global ─────────────────────────────
const state = {
  sock       : null,       // Socket Baileys aktif
  connected  : false,
  startedAt  : null,
  reconnects : 0,
};

/**
 * Simpan socket yang sedang aktif.
 * Dipanggil dari auth.js saat 'connection.update' = 'open'.
 */
function setSocket(sock) {
  state.sock      = sock;
  state.connected = true;
  state.startedAt = Date.now();
}

/**
 * Tandai koneksi terputus.
 */
function setDisconnected() {
  state.connected = false;
  state.reconnects++;
}

/**
 * Ambil socket aktif.
 * Lempar error jika belum ada (guard agar tidak crash diam-diam).
 */
function getSocket() {
  if (!state.sock) throw new Error('Socket belum tersedia. Bot belum terhubung.');
  return state.sock;
}

/**
 * Cek apakah bot sedang terhubung.
 */
function isConnected() {
  return state.connected;
}

/**
 * Uptime dalam milidetik (0 jika belum connect).
 */
function getUptime() {
  return state.startedAt ? Date.now() - state.startedAt : 0;
}

// ── Health-check: ping setiap 5 menit ───────────────
let healthInterval = null;

function startHealthCheck() {
  if (healthInterval) return; // jangan double

  healthInterval = setInterval(async () => {
    if (!state.connected || !state.sock) return;
    try {
      // Baileys menyediakan sendPresenceUpdate sebagai "ping" ringan
      await state.sock.sendPresenceUpdate('unavailable');
    } catch {
      // Jika gagal, koneksi mungkin sudah mati — biarkan event handler
      // 'connection.update' yang menangani reconnect
      logger.warn('[HealthCheck] Koneksi tidak responsif.');
    }
  }, 5 * 60 * 1000); // setiap 5 menit
}

function stopHealthCheck() {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}

// ── Graceful shutdown ────────────────────────────────
//
// PENTING: gunakan sock.end() bukan sock.logout()
//
// sock.logout() → cabut session dari server WA → 401 loggedOut
//                 session lokal ikut terhapus → harus login ulang
//
// sock.end()    → tutup WebSocket saja, session tetap tersimpan
//                 restart berikutnya langsung connect tanpa login ✅

let shuttingDown = false;

async function gracefulShutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[Shutdown] Menerima ${signal}. Menutup koneksi...`);
  stopHealthCheck();

  try {
    if (state.sock) state.sock.end(new Error('shutdown'));
  } catch {
    // abaikan
  }

  logger.info('[Shutdown] Session tersimpan. Restart untuk lanjut.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ─────────────────────────────────────────────────────
module.exports = {
  state,
  setSocket,
  setDisconnected,
  getSocket,
  isConnected,
  getUptime,
  startHealthCheck,
  stopHealthCheck,
};
