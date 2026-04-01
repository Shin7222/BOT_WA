const { isPremium: checkPremium, addPremium, removePremium, getUser } = require('../../database/db');
const { getNumber, toJID, parseMention } = require('../../utils/helper');
const moment = require('moment');

module.exports = {
  name: 'premium',
  alias: ['vip'],
  category: 'premium',
  description: 'Info premium / kelola premium user',
  usage: '!premium | !addpremium @user 30 | !removepremium @user',
  useLimit: false,

  async run({ sock, msg, jid, sender, usedPrefix, isOwner, args }) {
    const subCmd = args[0]?.toLowerCase();

    // ── !addpremium @user 30 ──────────────────
    if (subCmd === 'add' || subCmd === 'addpremium') {
      if (!isOwner) {
        return sock.sendMessage(jid, { text: '❌ Hanya owner yang bisa menambah premium!' }, { quoted: msg });
      }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const targetJid = mentioned[0];
      const days = parseInt(args[2] || args[1]) || 30;

      if (!targetJid) {
        return sock.sendMessage(jid, {
          text: `❌ Tag user yang ingin diberi premium!\n\nContoh: *${usedPrefix}premium add @user 30*`,
        }, { quoted: msg });
      }

      addPremium(targetJid, days);
      const expiry = moment().add(days, 'days').format('DD MMMM YYYY');

      return sock.sendMessage(jid, {
        text: `✅ Berhasil menambah premium!\n\n👤 User: @${getNumber(targetJid)}\n📅 Durasi: ${days} hari\n⏰ Expires: ${expiry}`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── !removepremium @user ─────────────────
    if (subCmd === 'remove' || subCmd === 'removepremium') {
      if (!isOwner) {
        return sock.sendMessage(jid, { text: '❌ Hanya owner yang bisa menghapus premium!' }, { quoted: msg });
      }
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const targetJid = mentioned[0];
      if (!targetJid) {
        return sock.sendMessage(jid, {
          text: `❌ Tag user yang ingin dihapus premiumnya!\n\nContoh: *${usedPrefix}premium remove @user*`,
        }, { quoted: msg });
      }

      removePremium(targetJid);
      return sock.sendMessage(jid, {
        text: `✅ Premium @${getNumber(targetJid)} berhasil dihapus.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }

    // ── !premium (cek status / info) ────────
    const user = getUser(sender);
    const premium = checkPremium(sender);
    const expiry = user.premiumExpiry
      ? moment(user.premiumExpiry).format('DD MMMM YYYY HH:mm')
      : '-';

    const text = `
⭐ *Premium Info*

Status: ${premium ? '✅ Aktif' : '❌ Tidak aktif'}
${premium ? `Expires: ${expiry}` : ''}

━━━━━━━━━━━━━━
🎁 *Keuntungan Premium:*
├ Limit 100 command/hari (biasa: 20)
├ Akses fitur eksklusif
└ Prioritas response bot

💰 *Cara Beli Premium:*
Hubungi admin bot untuk pembelian.

📞 *Kontak Admin:*
Ketik *${usedPrefix}owner* untuk nomor admin.
`.trim();

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
