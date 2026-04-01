/**
 * index.js — Entry Point WhatsApp Bot
 */
"use strict";

require("dotenv").config();

// ── Aktifkan Bad MAC suppressor SEBELUM apapun ─────────
// Harus dipanggil paling awal agar patch stderr aktif sejak start
require("./core/decryptErrorHandler");

const cron = require("node-cron");
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");

const { startConnection } = require("./core/auth");
const { onGroupParticipants, onMessageToxic } = require("./events/groupUpdate");
const { setSocket, startHealthCheck } = require("./core/connection");
const { registerSocket, resetCounter } = require("./core/decryptErrorHandler");
const { validateSession, deleteSession } = require("./core/sessionManager");
const { messageHandler, loadCommands } = require("./handler");
const { db } = require("./database/db");
const logger = require("./utils/logger");
const config = require("./config");

// ── Banner ──────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log(
    chalk.bold.green(`
╔═══════════════════════════════════╗
║        🤖 WhatsApp Bot            ║
║   Powered by Baileys + Node.js    ║
╠═══════════════════════════════════╣
║  Bot Name : ${config.botName.padEnd(22)}║
║  Prefix   : ${config.prefix.join(" ").padEnd(22)}║
║  Node.js  : ${process.version.padEnd(22)}║
╚═══════════════════════════════════╝
  `),
  );
}

// ── Pre-flight ──────────────────────────────────────────
async function preflight() {
  const valid = await validateSession();
  if (!valid) {
    const credsPath = path.join(
      __dirname,
      "session",
      config.sessionName,
      "creds.json",
    );
    if (await fs.pathExists(credsPath)) {
      logger.warn("Session corrupt. Menghapus untuk login ulang...");
      await deleteSession();
    }
  }
}

// ── Cron jobs ───────────────────────────────────────────
function setupCronJobs() {
  // Reset limit harian tengah malam
  cron.schedule("0 0 * * *", () => {
    logger.info("[CRON] Reset limit harian...");
    const today = new Date().toDateString();
    db.get("users")
      .value()
      .forEach((u) =>
        db
          .get("users")
          .find({ jid: u.jid })
          .assign({ usedLimit: 0, lastReset: today })
          .write(),
      );
    logger.success("[CRON] Limit direset.");
  });

  // Bersihkan log lama tiap Minggu
  cron.schedule("0 3 * * 0", () => {
    const logsDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logsDir)) return;
    const cutoff = Date.now() - 7 * 86400000;
    fs.readdirSync(logsDir).forEach((f) => {
      const fp = path.join(logsDir, f);
      if (fs.statSync(fp).mtimeMs < cutoff) fs.removeSync(fp);
    });
    logger.info("[CRON] Log lama dibersihkan.");
  });

  // Cek premium kadaluarsa tiap jam
  cron.schedule("0 * * * *", () => {
    const now = new Date();
    db.get("users")
      .filter({ premium: true })
      .value()
      .forEach((u) => {
        if (u.premiumExpiry && new Date(u.premiumExpiry) < now) {
          db.get("users")
            .find({ jid: u.jid })
            .assign({ premium: false, premiumExpiry: null, limit: 20 })
            .write();
          logger.info(`[CRON] Premium expired: ${u.jid}`);
        }
      });
  });
}

// ── Global error handler ────────────────────────────────
process.on("uncaughtException", (err) =>
  logger.error("[UncaughtException]", err.message),
);
process.on("unhandledRejection", (r) =>
  logger.error("[UnhandledRejection]", String(r)),
);

// ── Main ────────────────────────────────────────────────
async function main() {
  printBanner();
  await preflight();
  loadCommands();
  setupCronJobs();

  await startConnection(
    // onReady
    (sock) => {
      setSocket(sock);
      startHealthCheck();
      registerSocket(sock); // FIX BAD MAC: daftarkan socket ke error handler
      resetCounter(); // reset counter tiap reconnect
      logger.success("Bot siap menerima pesan!");

      // Hook event group participants (welcome/goodbye)
      sock.ev.on("group-participants.update", (update) => {
        onGroupParticipants(sock, update).catch((e) =>
          logger.error("[GroupEvent]", e.message),
        );
      });
    },
    // onMessage
    async (sock, messages) => {
      for (const msg of messages) {
        await onMessageToxic(sock, msg); // filter kata kasar
        await messageHandler(sock, msg);
      }
    },
  );
}

main().catch((err) => {
  logger.error("Fatal:", err.message);
  process.exit(1);
});
