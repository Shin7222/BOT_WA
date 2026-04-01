"use strict";

const { addCoins, removeCoins, getUser } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

const CHOICES = { batu: "🪨", gunting: "✂️", kertas: "📄" };
const ALIAS = {
  b: "batu",
  r: "batu",
  rock: "batu",
  g: "gunting",
  s: "gunting",
  scissors: "gunting",
  k: "kertas",
  p: "kertas",
  paper: "kertas",
};

// Menentukan pemenang: 1 = pemain1 menang, -1 = pemain2 menang, 0 = seri
function judge(c1, c2) {
  if (c1 === c2) return 0;
  if (
    (c1 === "batu" && c2 === "gunting") ||
    (c1 === "gunting" && c2 === "kertas") ||
    (c1 === "kertas" && c2 === "batu")
  )
    return 1;
  return -1;
}

// Tantangan pending: { challengerId, targetId, bet, timer }
const challenges = new Map();
// Jawaban yang sudah dikumpul dalam duel: { p1choice, p2choice }
const duels = new Map();

const BET_DEFAULT = 50;
const TIMEOUT_MS = 30_000;

module.exports = {
  name: "suit",
  alias: ["bkg", "rps", "batugunting"],
  category: "games",
  description: "Suit (Batu Gunting Kertas) — lawan user lain",
  usage: ".suit @user [taruhan]",
  useLimit: false,

  async run({
    sock,
    msg,
    jid,
    sender,
    senderNumber,
    args,
    fullArgs,
    usedPrefix,
  }) {
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];
    const betArg = args.find((a) => !isNaN(a) && parseInt(a) > 0);
    const bet = betArg ? parseInt(betArg) : BET_DEFAULT;

    // ── Jawaban pilihan (batu/gunting/kertas) ─────────
    const choiceRaw = args.find(
      (a) => ALIAS[a.toLowerCase()] || CHOICES[a.toLowerCase()],
    );
    const choice = choiceRaw
      ? ALIAS[choiceRaw.toLowerCase()] || choiceRaw.toLowerCase()
      : null;

    const duelKey = [sender, ...(target ? [target] : [])].sort().join(":");

    // ── Jawab duel yang sedang berjalan ───────────────
    if (choice && duels.has(duelKey)) {
      return handleDuelAnswer(
        sock,
        msg,
        jid,
        sender,
        choice,
        duelKey,
        usedPrefix,
      );
    }

    // ── Terima tantangan ──────────────────────────────
    if (
      fullArgs.toLowerCase() === "terima" ||
      fullArgs.toLowerCase() === "accept"
    ) {
      const pendingKey = [...challenges.keys()].find((k) =>
        k.endsWith(":" + sender),
      );
      if (!pendingKey) {
        return sock.sendMessage(
          jid,
          { text: "❌ Tidak ada tantangan untukmu saat ini!" },
          { quoted: msg },
        );
      }
      const ch = challenges.get(pendingKey);
      return startDuel(
        sock,
        msg,
        jid,
        ch.challengerId,
        sender,
        ch.bet,
        pendingKey,
        senderNumber,
        usedPrefix,
      );
    }

    // ── Kirim tantangan ke user ───────────────────────
    if (!target) {
      return sock.sendMessage(
        jid,
        {
          text: `✂️🪨📄 *Suit (Batu Gunting Kertas)*\n\n*Cara main:*\n${usedPrefix}suit @user [taruhan]\n\nContoh:\n• \`${usedPrefix}suit @user\` — taruhan default ${BET_DEFAULT} koin\n• \`${usedPrefix}suit @user 100\` — taruhan 100 koin\n\n*Pilihan:* batu / gunting / kertas`,
        },
        { quoted: msg },
      );
    }

    if (target === sender) {
      return sock.sendMessage(
        jid,
        { text: "😂 Tidak bisa suit melawan diri sendiri!" },
        { quoted: msg },
      );
    }

    // Cek koin
    const senderUser = getUser(sender);
    const targetUser = getUser(target);
    if (senderUser.coins < bet) {
      return sock.sendMessage(
        jid,
        { text: `❌ Koin tidak cukup! Kamu punya *${senderUser.coins}* koin.` },
        { quoted: msg },
      );
    }
    if (targetUser.coins < bet) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ @${getNumber(target)} tidak punya cukup koin untuk taruhan ${bet}.`,
          mentions: [target],
        },
        { quoted: msg },
      );
    }

    const chalKey = [sender, target].sort().join(":");
    challenges.set(chalKey, { challengerId: sender, targetId: target, bet });

    const timer = setTimeout(() => {
      challenges.delete(chalKey);
      sock
        .sendMessage(jid, {
          text: `⏰ Tantangan suit dari @${senderNumber} kadaluarsa.`,
          mentions: [sender],
        })
        .catch(() => {});
    }, TIMEOUT_MS);

    challenges.get(chalKey).timer = timer;

    const targetNum = getNumber(target).replace(/:[0-9]+/, "");
    await sock.sendMessage(
      jid,
      {
        text: `⚔️ *Tantangan Suit!*\n\n@${senderNumber} menantang @${targetNum}\n💰 Taruhan: *${bet} koin*\n\n@${targetNum}, ketik *${usedPrefix}suit terima* untuk menerima!\n_(30 detik untuk menjawab)_`,
        mentions: [sender, target],
      },
      { quoted: msg },
    );
  },
};

async function startDuel(
  sock,
  msg,
  jid,
  p1,
  p2,
  bet,
  chalKey,
  p2Num,
  usedPrefix,
) {
  const ch = challenges.get(chalKey);
  if (ch?.timer) clearTimeout(ch.timer);
  challenges.delete(chalKey);

  const duelKey = [p1, p2].sort().join(":");
  duels.set(duelKey, { p1, p2, bet, choices: {}, jid });

  const p1Num = getNumber(p1).replace(/:[0-9]+/, "");

  const timer = setTimeout(() => {
    duels.delete(duelKey);
    sock
      .sendMessage(jid, { text: "⏰ Waktu habis! Duel suit dibatalkan." })
      .catch(() => {});
  }, TIMEOUT_MS);
  duels.get(duelKey).timer = timer;

  await sock.sendMessage(
    jid,
    {
      text: `✅ *Duel Suit Dimulai!*\n\n@${p1Num} vs @${p2Num}\n💰 Taruhan: *${bet} koin*\n\nMasing-masing kirim pilihanmu di *private chat bot*:\n*${usedPrefix}suit batu* / *${usedPrefix}suit gunting* / *${usedPrefix}suit kertas*\n\n_(30 detik untuk memilih)_`,
      mentions: [p1, p2],
    },
    { quoted: msg },
  );
}

async function handleDuelAnswer(
  sock,
  msg,
  jid,
  sender,
  choice,
  duelKey,
  usedPrefix,
) {
  const duel = duels.get(duelKey);
  if (!duel) return;

  duel.choices[sender] = choice;

  await sock.sendMessage(
    jid,
    {
      text: `✅ Pilihanmu *${CHOICES[choice]} ${choice}* sudah dicatat! Menunggu lawan...`,
    },
    { quoted: msg },
  );

  // Cek apakah kedua pemain sudah pilih
  if (!duel.choices[duel.p1] || !duel.choices[duel.p2]) return;

  clearTimeout(duel.timer);
  duels.delete(duelKey);

  const c1 = duel.choices[duel.p1];
  const c2 = duel.choices[duel.p2];
  const result = judge(c1, c2);
  const p1Num = getNumber(duel.p1).replace(/:[0-9]+/, "");
  const p2Num = getNumber(duel.p2).replace(/:[0-9]+/, "");

  let resultText;
  if (result === 0) {
    resultText = `🤝 *SERI!*\nTidak ada yang menang.`;
  } else {
    const winner = result === 1 ? duel.p1 : duel.p2;
    const loser = result === 1 ? duel.p2 : duel.p1;
    const winNum = getNumber(winner).replace(/:[0-9]+/, "");
    removeCoins(loser, duel.bet);
    addCoins(winner, duel.bet);
    resultText = `🏆 *@${winNum} MENANG!*\n💰 +${duel.bet} koin`;
  }

  await sock
    .sendMessage(duel.jid, {
      text: `⚔️ *Hasil Duel Suit!*\n\n🪨✂️📄\n@${p1Num}: ${CHOICES[c1]} ${c1}\n@${p2Num}: ${CHOICES[c2]} ${c2}\n\n${resultText}`,
      mentions: [duel.p1, duel.p2],
    })
    .catch(() => {});
}
