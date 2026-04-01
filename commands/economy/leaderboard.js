"use strict";

const { getLeaderboard } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

module.exports = {
  name: "leaderboard",
  alias: ["lb", "top", "rank", "ranking"],
  category: "economy",
  description: "Papan peringkat koin atau level",
  usage: ".leaderboard [koin/level]",
  useLimit: false,

  async run({ sock, msg, jid, args, sender }) {
    const type = args[0]?.toLowerCase();
    const byCoins = !type || type === "koin" || type === "coins";
    const field = byCoins ? "coins" : "exp";
    const label = byCoins ? "💰 Koin" : "✨ EXP";
    const title = byCoins ? "Terkaya" : "Tertinggi";

    const top = getLeaderboard(field, 10);

    if (!top.length) {
      return sock.sendMessage(
        jid,
        {
          text: "📊 Belum ada data leaderboard!",
        },
        { quoted: msg },
      );
    }

    // Cari posisi sender
    const allUsers = getLeaderboard(field, 9999);
    const myPos = allUsers.findIndex((u) => u.jid === sender) + 1;
    const myData = allUsers.find((u) => u.jid === sender);

    const list = top
      .map((u, i) => {
        const num = getNumber(u.jid).replace(/:[0-9]+/, "");
        const val = byCoins
          ? u.coins.toLocaleString("id-ID") + " koin"
          : `Lv.${u.level} (${u.exp} EXP)`;
        const isMe = u.jid === sender ? " ← kamu" : "";
        return `${MEDALS[i]} @${num}\n    └ ${val}${isMe}`;
      })
      .join("\n\n");

    const myInfo = myData
      ? `\n\n📍 *Posisimu: #${myPos}*\n    └ ${byCoins ? myData.coins.toLocaleString("id-ID") + " koin" : `Lv.${myData.level}`}`
      : "";

    const mentions = top.map((u) => u.jid);

    await sock.sendMessage(
      jid,
      {
        text: `🏆 *Top 10 ${title}*\n${label}\n\n${list}${myInfo}`,
        mentions,
      },
      { quoted: msg },
    );
  },
};
