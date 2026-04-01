"use strict";

const { getNumber } = require("../../utils/helper");

// Simpan aktivitas per group di memory (reset saat restart)
// Format: { groupId: { jid: { count, lastMsg, name } } }
const groupActivity = new Map();

// Dipanggil dari handler setiap ada pesan di group
function recordActivity(groupId, senderJid, senderName) {
  if (!groupActivity.has(groupId)) groupActivity.set(groupId, new Map());
  const group = groupActivity.get(groupId);
  const prev = group.get(senderJid) || { count: 0, lastMsg: 0, name: "" };
  group.set(senderJid, {
    count: prev.count + 1,
    lastMsg: Date.now(),
    name:
      senderName || prev.name || getNumber(senderJid).replace(/:[0-9]+/, ""),
  });
}

module.exports = {
  name: "aktivitas",
  alias: ["stats", "groupstats", "sipalingaktif"],
  category: "group",
  description: "Statistik aktivitas member di group",
  usage: ".aktivitas [top/reset]",
  groupOnly: true,
  useLimit: false,

  // Export agar bisa dipanggil dari handler
  recordActivity,

  async run({ sock, msg, jid, args, isOwner, isGroupAdmin, usedPrefix }) {
    const sub = args[0]?.toLowerCase();

    // Reset statistik (admin/owner only)
    if (sub === "reset") {
      if (!isGroupAdmin && !isOwner) {
        return sock.sendMessage(
          jid,
          { text: "❌ Hanya admin yang bisa reset statistik!" },
          { quoted: msg },
        );
      }
      groupActivity.delete(jid);
      return sock.sendMessage(
        jid,
        { text: "✅ Statistik aktivitas group direset!" },
        { quoted: msg },
      );
    }

    const activity = groupActivity.get(jid);
    if (!activity || activity.size === 0) {
      return sock.sendMessage(
        jid,
        {
          text: `📊 Belum ada data aktivitas.\n\nStatistik akan mulai dihitung setelah bot restart.\n_Kirim beberapa pesan untuk memulai tracking._`,
        },
        { quoted: msg },
      );
    }

    // Sort by count
    const sorted = [...activity.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    );
    const top10 = sorted.slice(0, 10);
    const total = [...activity.values()].reduce((s, v) => s + v.count, 0);
    const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const list = top10
      .map(([jidKey, data], i) => {
        const num = data.name || getNumber(jidKey).replace(/:[0-9]+/, "");
        const pct = ((data.count / total) * 100).toFixed(1);
        const bar = "█".repeat(
          Math.round((data.count / sorted[0][1].count) * 8),
        );
        return `${MEDALS[i]} @${num}\n   ${bar} ${data.count} pesan (${pct}%)`;
      })
      .join("\n\n");

    const mentions = top10.map(([j]) => j);

    await sock.sendMessage(
      jid,
      {
        text: `📊 *Statistik Aktivitas Group*\n\n👥 Total member aktif: ${activity.size}\n💬 Total pesan: ${total}\n\n${list}\n\n_Data sejak bot terakhir online_\n_Reset: \`${usedPrefix}aktivitas reset\`_`,
        mentions,
      },
      { quoted: msg },
    );
  },
};
