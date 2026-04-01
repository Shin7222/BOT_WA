/**
 * core/sessionManager.js
 * ─────────────────────────────────────────────────────
 * Memeriksa, memvalidasi, mem-backup, dan menghapus
 * session Baileys di folder /session.
 * ─────────────────────────────────────────────────────
 */

'use strict';

const fs     = require('fs-extra');
const path   = require('path');
const logger = require('../utils/logger');
const { SESSION_DIR } = require('./auth');

// File-file yang WAJIB ada agar session dianggap valid
const REQUIRED_FILES = ['creds.json'];

// ─────────────────────────────────────────────────────
// Cek apakah session ada & valid
// ─────────────────────────────────────────────────────

async function sessionExists() {
  if (!(await fs.pathExists(SESSION_DIR))) return false;
  for (const file of REQUIRED_FILES) {
    if (!(await fs.pathExists(path.join(SESSION_DIR, file)))) return false;
  }
  return true;
}

/**
 * Validasi isi creds.json agar tidak corrupt.
 * Baileys menyimpan JSON — kalau gagal parse berarti rusak.
 */
async function validateSession() {
  const credsPath = path.join(SESSION_DIR, 'creds.json');
  if (!(await fs.pathExists(credsPath))) return false;
  try {
    const raw = await fs.readFile(credsPath, 'utf8');
    const creds = JSON.parse(raw);
    // Minimal harus punya field 'me' atau 'noiseKey'
    return !!(creds.me || creds.noiseKey);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────
// Hapus session
// ─────────────────────────────────────────────────────

async function deleteSession() {
  if (await fs.pathExists(SESSION_DIR)) {
    await fs.remove(SESSION_DIR);
    logger.warn('[SessionManager] Session dihapus.');
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────
// Backup session
// ─────────────────────────────────────────────────────

async function backupSession() {
  if (!(await sessionExists())) {
    logger.warn('[SessionManager] Tidak ada session untuk di-backup.');
    return null;
  }
  const backupDir = path.join(
    SESSION_DIR, '..', `backup_${Date.now()}`,
  );
  await fs.copy(SESSION_DIR, backupDir);
  logger.success(`[SessionManager] Session di-backup ke: ${backupDir}`);
  return backupDir;
}

/**
 * Restore session dari backup terbaru.
 */
async function restoreLatestBackup() {
  const parentDir = path.join(SESSION_DIR, '..');
  const entries   = await fs.readdir(parentDir);
  const backups   = entries
    .filter(e => e.startsWith('backup_'))
    .sort()
    .reverse(); // yang terbaru pertama

  if (backups.length === 0) {
    logger.warn('[SessionManager] Tidak ada backup yang tersedia.');
    return false;
  }

  const latest = path.join(parentDir, backups[0]);
  await fs.remove(SESSION_DIR);
  await fs.copy(latest, SESSION_DIR);
  logger.success(`[SessionManager] Session dipulihkan dari: ${backups[0]}`);
  return true;
}

// ─────────────────────────────────────────────────────
// Info session
// ─────────────────────────────────────────────────────

async function getSessionInfo() {
  const exists   = await sessionExists();
  const valid    = exists ? await validateSession() : false;
  let   sizeKB   = 0;
  let   fileCount = 0;

  if (exists) {
    const files = await fs.readdir(SESSION_DIR);
    fileCount   = files.length;
    for (const f of files) {
      const stat = await fs.stat(path.join(SESSION_DIR, f));
      sizeKB += stat.size;
    }
    sizeKB = Math.round(sizeKB / 1024);
  }

  return {
    path      : SESSION_DIR,
    exists,
    valid,
    fileCount,
    sizeKB,
  };
}

// ─────────────────────────────────────────────────────
module.exports = {
  sessionExists,
  validateSession,
  deleteSession,
  backupSession,
  restoreLatestBackup,
  getSessionInfo,
};
