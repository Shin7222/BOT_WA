"use strict";

// { groupId_pollId: { question, options: [{text, votes: Set<jid>}], creator, active, endTime } }
const polls = new Map();
let pollCounter = 0;

module.exports = {
  name: "polling",
  alias: ["poll", "vote", "voting"],
  category: "group",
  description: "Buat polling/voting di group",
  usage: ".polling <pertanyaan> | opsi1 | opsi2 | opsi3",
  groupOnly: true,

  async run({
    sock,
    msg,
    jid,
    sender,
    senderNumber,
    fullArgs,
    args,
    usedPrefix,
  }) {
    const sub = args[0]?.toLowerCase();

    // ── .polling hasil / .polling stop ────────────────
    if (
      sub === "hasil" ||
      sub === "result" ||
      sub === "stop" ||
      sub === "end"
    ) {
      // Cari poll aktif di group ini
      const pollKey = [...polls.keys()].find((k) => k.startsWith(jid + "_"));
      if (!pollKey) {
        return sock.sendMessage(
          jid,
          { text: "❌ Tidak ada polling aktif di group ini!" },
          { quoted: msg },
        );
      }
      const poll = polls.get(pollKey);
      return showResults(
        sock,
        jid,
        poll,
        pollKey,
        sub === "stop" || sub === "end",
        msg,
      );
    }

    // ── .polling <angka> — vote ────────────────────────
    const voteNum = parseInt(sub);
    if (!isNaN(voteNum)) {
      const pollKey = [...polls.keys()].find((k) => k.startsWith(jid + "_"));
      if (!pollKey) {
        return sock.sendMessage(
          jid,
          { text: "❌ Tidak ada polling aktif!" },
          { quoted: msg },
        );
      }
      const poll = polls.get(pollKey);
      if (!poll.active) {
        return sock.sendMessage(
          jid,
          { text: "❌ Polling sudah ditutup!" },
          { quoted: msg },
        );
      }
      const idx = voteNum - 1;
      if (idx < 0 || idx >= poll.options.length) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Pilihan tidak valid! Masukkan angka 1–${poll.options.length}`,
          },
          { quoted: msg },
        );
      }
      // Hapus vote lama di opsi lain
      poll.options.forEach((o) => o.votes.delete(sender));
      // Tambah vote baru
      poll.options[idx].votes.add(sender);

      const total = poll.options.reduce((s, o) => s + o.votes.size, 0);
      return sock.sendMessage(
        jid,
        {
          text: `✅ Vote kamu tercatat!\n\n*${voteNum}. ${poll.options[idx].text}*\n👥 ${poll.options[idx].votes.size} suara dari ${total} total\n\nLihat hasil: \`${usedPrefix}polling hasil\``,
        },
        { quoted: msg },
      );
    }

    // ── Buat polling baru ─────────────────────────────
    if (!fullArgs || !fullArgs.includes("|")) {
      return sock.sendMessage(
        jid,
        {
          text: `📊 *Cara buat polling:*\n\n\`${usedPrefix}polling Makanan favorit? | Nasi Goreng | Mie Ayam | Soto\`\n\nPerintah lain:\n• \`${usedPrefix}polling 1\` — vote opsi 1\n• \`${usedPrefix}polling hasil\` — lihat hasil\n• \`${usedPrefix}polling stop\` — tutup polling`,
        },
        { quoted: msg },
      );
    }

    // Cek apakah sudah ada polling aktif
    const existing = [...polls.keys()].find((k) => k.startsWith(jid + "_"));
    if (existing && polls.get(existing)?.active) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Sudah ada polling aktif!\nTutup dulu: \`${usedPrefix}polling stop\``,
        },
        { quoted: msg },
      );
    }

    const parts = fullArgs
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const question = parts[0];
    const options = parts.slice(1).slice(0, 8); // maks 8 opsi

    if (options.length < 2) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Minimal 2 opsi!\nContoh: \`${usedPrefix}polling Pilihan? | Opsi A | Opsi B\``,
        },
        { quoted: msg },
      );
    }

    pollCounter++;
    const pollKey = `${jid}_${pollCounter}`;
    const poll = {
      question,
      options: options.map((t) => ({ text: t, votes: new Set() })),
      creator: sender,
      active: true,
      createdAt: Date.now(),
    };
    polls.set(pollKey, poll);

    // Auto tutup setelah 24 jam
    setTimeout(() => {
      if (polls.has(pollKey)) polls.get(pollKey).active = false;
    }, 86400000);

    const optList = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
    await sock.sendMessage(
      jid,
      {
        text: `📊 *POLLING BARU!*\n\n❓ *${question}*\n\n${optList}\n\n*Cara vote:* Ketik \`${usedPrefix}polling <nomor>\`\nContoh: \`${usedPrefix}polling 1\`\n\nLihat hasil: \`${usedPrefix}polling hasil\`\n_Polling otomatis ditutup 24 jam_`,
      },
      { quoted: msg },
    );
  },
};

async function showResults(sock, jid, poll, pollKey, close, msg) {
  if (close) poll.active = false;

  const total = poll.options.reduce((s, o) => s + o.votes.size, 0);
  const MEDALS = ["🥇", "🥈", "🥉"];
  const sorted = [...poll.options].sort((a, b) => b.votes.size - a.votes.size);

  const rows = poll.options
    .map((o, i) => {
      const pct = total ? ((o.votes.size / total) * 100).toFixed(1) : "0.0";
      const bar = total
        ? "█".repeat(Math.round((o.votes.size / total) * 10)) +
          "░".repeat(10 - Math.round((o.votes.size / total) * 10))
        : "░░░░░░░░░░";
      const rank = sorted.indexOf(o);
      return `${rank < 3 ? MEDALS[rank] : `${i + 1}.`} *${o.text}*\n   ${bar} ${o.votes.size} suara (${pct}%)`;
    })
    .join("\n\n");

  await sock.sendMessage(
    jid,
    {
      text: `📊 *Hasil Polling*${close ? " (DITUTUP)" : ""}\n\n❓ *${poll.question}*\n\n${rows}\n\n👥 Total suara: *${total}*`,
    },
    { quoted: msg },
  );
}
