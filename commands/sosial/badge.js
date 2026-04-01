"use strict";

const { getUserBadges, BADGE_LIST, getUser } = require("../../database/db");
const { getNumber } = require("../../utils/helper");

module.exports = {
  name: "badge",
  alias: ["badges", "achievement", "pencapaian"],
  category: "social",
  description: "Lihat koleksi badge kamu atau semua badge yang tersedia",
  usage: ".badge [all/@user]",
  useLimit: false,

  async run({ sock, msg, jid, sender, args, usedPrefix }) {
    const sub = args[0]?.toLowerCase();
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // ── .badge all — tampilkan semua badge yang ada ──
    if (sub === "all" || sub === "semua") {
      const allBadges = Object.values(BADGE_LIST);
      const list = allBadges
        .map((b) => `${b.emoji} *${b.name}*\n   └ ${b.desc}`)
        .join("\n\n");

      return sock.sendMessage(
        jid,
        {
          text: `🏅 *Semua Badge (${allBadges.length})*\n\n${list}\n\n💡 Ketik *${usedPrefix}badge* untuk lihat koleksimu`,
        },
        { quoted: msg },
      );
    }

    // ── .badge [@user] — lihat koleksi badge ──
    const target = mentioned[0] || sender;
    const targetNum = getNumber(target).replace(/:[0-9]+/, "");
    const isSelf = target === sender;

    const myBadges = getUserBadges(target);
    const allBadges = Object.values(BADGE_LIST);
    const owned = new Set(myBadges.map((b) => b.id));

    // Tampilkan dengan status dimiliki / belum
    const list = allBadges
      .map((b) => {
        const have = owned.has(b.id);
        return `${have ? b.emoji : "🔒"} ${have ? `*${b.name}*` : `~~${b.name}~~`}\n   └ ${b.desc}`;
      })
      .join("\n\n");

    const text = `🏅 *Badge ${isSelf ? "Kamu" : "@" + targetNum}*
Dimiliki: ${myBadges.length}/${allBadges.length}

${list}

💡 Ketik *${usedPrefix}badge all* untuk melihat cara mendapatkan badge`;

    await sock.sendMessage(
      jid,
      {
        text,
        mentions: [target],
      },
      { quoted: msg },
    );
  },
};
