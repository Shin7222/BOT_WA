"use strict";

const { getGroup, updateUser, getUser } = require("../database/db");
const { getNumber } = require("../utils/helper");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────
// EVENT: member masuk / keluar group
// ─────────────────────────────────────────────────────

async function onGroupParticipants(sock, update) {
  try {
    const { id: groupId, participants, action } = update;
    const group = getGroup(groupId);
    let meta;

    try {
      meta = await sock.groupMetadata(groupId);
    } catch {
      return;
    }
    const groupName = meta.subject || "Group";

    for (const participant of participants) {
      const num = getNumber(participant).replace(/:[0-9]+/, "");

      // ── WELCOME ──────────────────────────────────
      if (action === "add" && group.welcome) {
        let msg = (group.welcomeMsg || "Selamat datang @user di @group! 👋")
          .replace("@user", `@${num}`)
          .replace("@group", groupName);

        // Coba ambil foto profil member baru
        let ppBuffer = null;
        try {
          const ppUrl = await sock.profilePictureUrl(participant, "image");
          const axios = require("axios");
          const res = await axios.get(ppUrl, {
            responseType: "arraybuffer",
            timeout: 5000,
          });
          ppBuffer = Buffer.from(res.data);
        } catch {
          // Tidak ada foto profil — kirim teks saja
        }

        if (ppBuffer) {
          await sock
            .sendMessage(groupId, {
              image: ppBuffer,
              caption: msg,
              mentions: [participant],
            })
            .catch((e) => logger.error("Welcome image error:", e.message));
        } else {
          await sock
            .sendMessage(groupId, {
              text: msg,
              mentions: [participant],
            })
            .catch((e) => logger.error("Welcome text error:", e.message));
        }
      }

      // ── GOODBYE ──────────────────────────────────
      if ((action === "remove" || action === "leave") && group.goodbye) {
        const msg = (group.goodbyeMsg || "Selamat tinggal @user dari @group 👋")
          .replace("@user", `@${num}`)
          .replace("@group", groupName);

        await sock
          .sendMessage(groupId, {
            text: msg,
            mentions: [participant],
          })
          .catch((e) => logger.error("Goodbye error:", e.message));
      }
    }
  } catch (err) {
    logger.error("[GroupUpdate] Error:", err.message);
  }
}

// ─────────────────────────────────────────────────────
// EVENT: pesan masuk — filter kata kasar
// ─────────────────────────────────────────────────────

async function onMessageToxic(sock, msg) {
  try {
    if (!msg.message) return;
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) return; // hanya di grup

    const group = getGroup(jid);
    if (!group.antitoxic) return;

    // Ambil teks
    const m = msg.message;
    const text =
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      "";

    if (!text) return;

    // Import hasToxicWord dari command
    const { hasToxicWord } = require("../commands/admin/antitoxic");
    if (!hasToxicWord(text)) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const num = getNumber(sender).replace(/:[0-9]+/, "");

    // Cek apakah bot admin
    const meta = await sock.groupMetadata(jid).catch(() => null);
    if (!meta) return;
    const botId =
      (sock.user?.id || "").replace(/:[0-9]+@.*/, "") + "@s.whatsapp.net";
    const botAdmin = meta.participants.find(
      (p) => p.id.replace(/:[0-9]+@/, "@") === botId.replace(/:[0-9]+@/, "@"),
    )?.admin;

    // Hapus pesan jika bot admin
    if (botAdmin) {
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    }

    // Catat peringatan
    const user = getUser(sender);
    const warns = (user.warnings || 0) + 1;
    updateUser(sender, { warnings: warns });

    await sock
      .sendMessage(jid, {
        text: `⚠️ @${num}, tolong jaga bahasa ya!\nPeringatan: *${warns}/3*\n\n_Pesan kamu mengandung kata yang tidak pantas._`,
        mentions: [sender],
      })
      .catch(() => {});

    // Kick setelah 3 peringatan jika bot admin
    if (warns >= 3 && botAdmin) {
      await sock
        .sendMessage(jid, {
          text: `🚫 @${num} telah dikick karena 3x peringatan kata kasar.`,
          mentions: [sender],
        })
        .catch(() => {});
      await sock
        .groupParticipantsUpdate(jid, [sender], "remove")
        .catch(() => {});
      updateUser(sender, { warnings: 0 });
    }
  } catch (err) {
    logger.error("[Antitoxic] Error:", err.message);
  }
}

module.exports = { onGroupParticipants, onMessageToxic };
