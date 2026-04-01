"use strict";

const { addCoins, removeCoins, getUser } = require("../../database/db");

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];

// Bobot tiap simbol (semakin tinggi = semakin sering muncul)
const WEIGHTS = [30, 25, 20, 15, 6, 3, 1];

// Multiplier untuk 3 simbol sama
const MULTIPLIERS = {
  "🍒": 2,
  "🍋": 2.5,
  "🍊": 3,
  "🍇": 4,
  "⭐": 6,
  "💎": 10,
  "7️⃣": 20,
};

// Multiplier 2 simbol sama (partial win)
const PARTIAL_MULTIPLIERS = {
  "7️⃣": 3,
  "💎": 2,
  "⭐": 1.5,
};

const MIN_BET = 10;
const MAX_BET = 1000;
const COOLDOWN_MS = 5000; // 5 detik

const cooldowns = new Map();

function spin() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  return Array.from({ length: 3 }, () => {
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= WEIGHTS[i];
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
  });
}

function calcWin(reels, bet) {
  const [a, b, c] = reels;

  // Jackpot: 3 sama
  if (a === b && b === c) {
    const mult = MULTIPLIERS[a] || 2;
    return { type: "jackpot", mult, win: Math.floor(bet * mult) };
  }

  // Partial: 2 sama (khusus 7, 💎, ⭐)
  const pairs = [a, b, c].filter((v, i, arr) => arr.indexOf(v) !== i);
  if (pairs.length > 0 && PARTIAL_MULTIPLIERS[pairs[0]]) {
    const mult = PARTIAL_MULTIPLIERS[pairs[0]];
    return { type: "partial", mult, win: Math.floor(bet * mult) };
  }

  // Kalah
  return { type: "lose", mult: 0, win: 0 };
}

module.exports = {
  name: "slot",
  alias: ["slots", "mesin", "jackpot"],
  category: "games",
  description: "Putar slot machine dengan koin",
  usage: ".slot [taruhan]  — min 10, maks 1000 koin",

  async run({ sock, msg, jid, sender, args, usedPrefix }) {
    // Cooldown
    const lastSpin = cooldowns.get(sender) || 0;
    const diff = Date.now() - lastSpin;
    if (diff < COOLDOWN_MS) {
      return sock.sendMessage(
        jid,
        {
          text: `⏳ Tunggu *${((COOLDOWN_MS - diff) / 1000).toFixed(1)}s* sebelum spin lagi!`,
        },
        { quoted: msg },
      );
    }

    const betArg = parseInt(args[0]);
    const bet = isNaN(betArg)
      ? 50
      : Math.min(Math.max(betArg, MIN_BET), MAX_BET);
    const user = getUser(sender);

    if (user.coins < bet) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Koin tidak cukup!\nKoin kamu: *${user.coins}* | Taruhan: *${bet}*`,
        },
        { quoted: msg },
      );
    }

    cooldowns.set(sender, Date.now());
    removeCoins(sender, bet);

    // Animasi singkat
    await sock.sendMessage(
      jid,
      {
        text: `🎰 *Memutar...*\n\n[ 🔄 | 🔄 | 🔄 ]\n\n_Semoga beruntung!_`,
      },
      { quoted: msg },
    );

    await new Promise((r) => setTimeout(r, 1500));

    const reels = spin();
    const result = calcWin(reels, bet);
    const after = getUser(sender);

    let resultText = "";
    if (result.type === "jackpot") {
      addCoins(sender, result.win);
      resultText = `🎉 *JACKPOT! 3 ${reels[0]} ${reels[0]} ${reels[0]}!*\n💰 +${result.win} koin (${result.mult}x)`;
    } else if (result.type === "partial") {
      addCoins(sender, result.win);
      resultText = `✨ *Hampir! Dapat ${result.win} koin (${result.mult}x)*`;
    } else {
      resultText = `😭 *Tidak menang...*\n💸 -${bet} koin`;
    }

    const finalCoins = result.win > 0 ? after.coins + result.win : after.coins;

    await sock.sendMessage(
      jid,
      {
        text: `🎰 *Slot Machine*\n\n[ ${reels[0]} | ${reels[1]} | ${reels[2]} ]\n\n${resultText}\n\n💼 Koin: ${finalCoins.toLocaleString("id-ID")}\n\n_Spin lagi: ${usedPrefix}slot ${bet}_`,
      },
      { quoted: msg },
    );
  },
};
