const fs = require("fs");
const path = require("path");
const config = require("./config");
const {
  getUser,
  isPremium,
  hasLimit,
  decreaseLimit,
  addExp,
  getGroup,
} = require("./database/db");
const {
  getNumber,
  isGroup,
  getPrefix,
  sendWithDelay,
} = require("./utils/helper");
const { checkCooldown, checkSpam } = require("./utils/antiSpam");
const logger = require("./utils/logger");
const queue = require("./utils/queue");

// ─────────────────────────────────────────────────────
// LOAD SEMUA COMMANDS
// ─────────────────────────────────────────────────────

const commands = new Map();
const aliases = new Map();

function loadCommands() {
  const commandsDir = path.join(__dirname, "commands");
  const categories = fs.readdirSync(commandsDir);

  for (const category of categories) {
    const catPath = path.join(commandsDir, category);
    if (!fs.statSync(catPath).isDirectory()) continue;

    const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      try {
        const cmd = require(path.join(catPath, file));
        if (!cmd.name || !cmd.run) {
          logger.warn(`Command ${file} tidak memiliki name/run, dilewati.`);
          continue;
        }
        commands.set(cmd.name, { ...cmd, category });
        if (cmd.alias) {
          for (const a of cmd.alias) aliases.set(a, cmd.name);
        }
        logger.info(`Command loaded: ${category}/${cmd.name}`);
      } catch (err) {
        logger.error(`Gagal load command ${file}: ${err.message}`);
      }
    }
  }
  logger.success(`Total commands loaded: ${commands.size}`);
}

// ─────────────────────────────────────────────────────
// HANDLER UTAMA
// ─────────────────────────────────────────────────────

async function messageHandler(sock, msg) {
  try {
    if (!msg.message) return;

    // fromMe = true artinya pesan dikirim dari nomor bot itu sendiri.
    // Biasanya ini diabaikan, KECUALI:
    // - pesan dikirim ke chat diri sendiri (remoteJid = nomor bot = owner)
    //   → ini cara owner pakai bot dari nomornya sendiri
    // - pesan di grup dari bot sendiri → tetap abaikan (hindari loop)
    if (msg.key.fromMe) {
      // Abaikan pesan bot di grup (hindari loop tak terbatas)
      if (msg.key.remoteJid?.endsWith("@g.us")) return;
      // Semua fromMe di private chat (termasuk "Pesan ke diri sendiri") → lanjut
    }

    // ── FIX BAD MAC: abaikan pesan yang gagal didekripsi ──
    // Tanda pesan enkripsi gagal: kunci 'messageContextInfo' saja
    // atau tipe dimulai dengan 'enc' / berisi 'senderKeyDistribution'
    const msgKeys = Object.keys(msg.message);
    const isDecryptFailed =
      msgKeys.includes("senderKeyDistributionMessage") ||
      (msgKeys.length === 1 && msgKeys[0] === "messageContextInfo") ||
      msgKeys.some((k) => k.startsWith("enc"));
    if (isDecryptFailed) return; // lewati, jangan crash

    // ── Auto Read ────────────────────────────────
    if (config.autoRead) {
      await sock.readMessages([msg.key]).catch(() => {});
    }

    // ── Ekstrak info dasar ─────────────────────
    const botJid = sock.user?.id || "";
    const botNumber = botJid.replace(/:[0-9]+@.*/g, "").replace(/@.*/g, "");

    // rawJid = tujuan pesan (bisa nomor lain saat bot chat ke user)
    // Bersihkan :0 dari JID agar bisa dipakai sebagai tujuan kirim
    const rawJid = msg.key.remoteJid;
    const jid = rawJid.replace(/:[0-9]+@/, "@"); // bersihkan :0 tapi jaga suffix

    const isGroupChat = isGroup(jid);

    // sender = siapa yang mengirim pesan
    // fromMe = bot yang kirim → sender adalah bot (owner)
    const sender = msg.key.fromMe
      ? `${botNumber}@s.whatsapp.net`
      : msg.key.participant || rawJid;

    const senderNumber = getNumber(sender).replace(/:[0-9]+/, "");

    // ── Unwrap pesan ─────────────────────────
    // Baileys kadang membungkus pesan dalam ephemeralMessage,
    // viewOnceMessage, documentWithCaptionMessage, dll.
    // Unwrap sampai dapat pesan inti.
    let msgContent = msg.message;
    const wrappers = [
      "ephemeralMessage",
      "viewOnceMessage",
      "viewOnceMessageV2",
      "documentWithCaptionMessage",
      "templateMessage",
      "buttonsMessage",
      "interactiveResponseMessage",
    ];
    for (const w of wrappers) {
      if (msgContent[w]?.message) {
        msgContent = msgContent[w].message;
        break;
      }
    }

    // ── Ambil teks pesan ─────────────────────
    const type = Object.keys(msgContent)[0];
    let text = "";

    if (type === "conversation") text = msgContent.conversation;
    else if (type === "extendedTextMessage")
      text = msgContent.extendedTextMessage?.text || "";
    else if (type === "imageMessage")
      text = msgContent.imageMessage?.caption || "";
    else if (type === "videoMessage")
      text = msgContent.videoMessage?.caption || "";
    else return; // abaikan tipe lain untuk command

    if (!text) return;

    // ── Cek prefix ───────────────────────────
    const usedPrefix = getPrefix(text, config.prefix);
    if (!usedPrefix) return; // bukan command

    // ── Parse command & args ─────────────────
    const body = text.slice(usedPrefix.length).trim();
    const [rawCmd, ...args] = body.split(" ");
    const cmdName = rawCmd.toLowerCase();
    const fullArgs = args.join(" ");

    // ── Cek alias ───────────────────────────
    const resolvedName = aliases.get(cmdName) || cmdName;
    const command = commands.get(resolvedName);
    if (!command) return;

    // ── Permission check ─────────────────────
    // Root cause: Baileys v7+ kadang mengirim pesan dengan JID @lid
    // (linked device ID) — angka internal seperti 245547977990282,
    // BUKAN nomor HP asli seperti 6289xxx.
    //
    // Fix: bandingkan ownerNumber dengan TIGA sumber sekaligus:
    //   1. senderNumber  — hasil parse JID normal (@s.whatsapp.net)
    //   2. botNumber     — nomor asli dari sock.user.id (selalu benar)
    //   3. @lid fallback — jika sender @lid DAN nomor bot ada di ownerNumber,
    //                      berarti itu owner yang chat ke botnya sendiri
    // botNumber sudah dideklarasikan di atas
    const isOwnerByNumber = config.ownerNumber.includes(senderNumber);
    const isOwnerByLid =
      sender.endsWith("@lid") && config.ownerNumber.includes(botNumber);
    const isOwnerByFromMe = msg.key.fromMe === true; // nomor bot pakai dirinya sendiri
    const isOwner = isOwnerByNumber || isOwnerByLid || isOwnerByFromMe;
    const userPremium = isPremium(sender);
    const userData = getUser(sender);

    // Cek maintenance mode
    if (config.maintenance && !isOwner) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `⚙️ Bot sedang dalam mode *maintenance*.\nCoba lagi nanti ya! 🙏`,
        },
        { quoted: msg },
      );
    }

    // ── Cek Bot Mode (private / public) ──────
    if (config.botMode === "private" && !isOwner) {
      // Dapatkan nomor bot sendiri
      // botNumber sudah dideklarasikan di atas

      // Private mode: HANYA izinkan pesan langsung ke nomor bot
      // (JID format private = [nomor]@s.whatsapp.net)
      // Tolak: pesan dari grup, pesan dari broadcast
      if (isGroupChat) {
        // Diam saja di grup — tidak kirim balasan agar tidak spam
        return;
      }

      // Tolak pesan private dari nomor selain ke bot langsung
      // (jid harus = nomor bot itu sendiri, bukan orang lain chat ke bot)
      // Catatan: saat orang chat ke bot, jid = sender@s.whatsapp.net ✅
      // Tidak perlu cek tambahan — sudah aman.
    }

    // Cek command owner only
    if (command.ownerOnly && !isOwner) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `❌ Command ini hanya untuk *owner bot*!`,
        },
        { quoted: msg },
      );
    }

    // Cek command group only
    if (command.groupOnly && !isGroupChat) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `❌ Command ini hanya bisa digunakan di *group*!`,
        },
        { quoted: msg },
      );
    }

    // Cek command private only
    if (command.privateOnly && isGroupChat) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `❌ Command ini hanya bisa digunakan di *private chat*!`,
        },
        { quoted: msg },
      );
    }

    // Cek admin group
    let isGroupAdmin = false;
    let isBotAdmin = false;
    if (isGroupChat) {
      const groupMeta = await sock.groupMetadata(jid).catch(() => null);
      if (groupMeta) {
        const admins = groupMeta.participants
          .filter((p) => p.admin)
          .map((p) => p.id);
        isGroupAdmin = admins.includes(sender);
        isBotAdmin = admins.includes(
          sock.user.id.replace(":0", "").replace(":1", ""),
        );
      }
    }

    if (command.adminOnly && !isGroupAdmin && !isOwner) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `❌ Command ini hanya untuk *admin group*!`,
        },
        { quoted: msg },
      );
    }

    if (command.premiumOnly && !userPremium && !isOwner) {
      return sendWithDelay(
        sock,
        jid,
        {
          text: `⭐ Command ini khusus untuk *premium user*!\n\nKetik *${usedPrefix}premium* untuk info lebih lanjut.`,
        },
        { quoted: msg },
      );
    }

    // ── Anti-spam check ──────────────────────
    if (!isOwner) {
      const spamStatus = checkSpam(sender);
      if (spamStatus === "blocked") {
        return sendWithDelay(
          sock,
          jid,
          {
            text: `🚫 Kamu diblok sementara karena spam!\nCoba lagi dalam *1 menit*.`,
          },
          { quoted: msg },
        );
      }
      if (spamStatus === "warned") {
        await sendWithDelay(
          sock,
          jid,
          {
            text: `⚠️ Peringatan! Jangan spam command ya!\nKamu akan diblok sementara jika terus spam.`,
          },
          { quoted: msg },
        );
      }
    }

    // ── Cooldown check ───────────────────────
    if (!isOwner && command.cooldown !== 0) {
      const remaining = checkCooldown(sender, resolvedName);
      if (remaining > 0) {
        return sendWithDelay(
          sock,
          jid,
          {
            text: `⏳ Tunggu *${remaining} detik* sebelum menggunakan command ini lagi!`,
          },
          { quoted: msg },
        );
      }
    }

    // ── Limit check ──────────────────────────
    if (command.useLimit !== false && !isOwner) {
      if (!hasLimit(sender, userPremium, isOwner)) {
        return sendWithDelay(
          sock,
          jid,
          {
            text:
              `❌ Limit harianmu sudah habis!\n\n` +
              `User biasa: *20/hari*\nPremium: *100/hari*\n\n` +
              `Ketik *${usedPrefix}premium* untuk upgrade!`,
          },
          { quoted: msg },
        );
      }
      decreaseLimit(sender);
    }

    // ── Log command ──────────────────────────
    logger.command(senderNumber, `${usedPrefix}${resolvedName}`);

    // ── Tracking aktivitas group ──────────────
    if (isGroupChat) {
      try {
        const { recordActivity } = require("./commands/group/aktivitas");
        const pushName = msg.pushName || "";
        recordActivity(jid, sender, pushName);
      } catch {
        /* abaikan jika command belum diload */
      }
    }

    // ── Beri EXP ────────────────────────────
    const expResult = addExp(sender, 5);
    // Bisa tambah notifikasi level up jika mau

    // ── Jalankan command via queue ────────────
    logger.info(`[RUN] Menjalankan command: ${resolvedName}`);
    const ctx = {
      sock,
      msg,
      jid,
      sender,
      senderNumber,
      args,
      fullArgs,
      usedPrefix,
      isOwner,
      isGroupChat,
      isGroupAdmin,
      isBotAdmin,
      isPremium: userPremium,
      userData,
      expResult,
      command: resolvedName,
    };

    // Tambahkan ke queue agar tidak spam kirim
    await queue
      .add(() => command.run(ctx))
      .catch((err) => {
        logger.error(
          `[RUN ERROR] ${resolvedName}: ${err.message}\n${err.stack}`,
        );
        sock
          .sendMessage(
            jid,
            { text: `❌ Error: ${err.message}` },
            { quoted: msg },
          )
          .catch(() => {});
      });
  } catch (err) {
    logger.error("Handler error:", err.message, err.stack);
  }
}

module.exports = { messageHandler, loadCommands, commands };
