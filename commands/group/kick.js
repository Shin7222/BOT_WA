const { getNumber } = require('../../utils/helper');

module.exports = {
  name: 'kick',
  alias: ['keluarkan'],
  category: 'group',
  description: 'Kick member dari group',
  usage: '!kick @user',
  groupOnly: true,
  adminOnly: true,

  async run({ sock, msg, jid, isBotAdmin, isOwner }) {
    if (!isBotAdmin) {
      return sock.sendMessage(jid, {
        text: '❌ Bot bukan admin group! Jadikan bot admin terlebih dahulu.',
      }, { quoted: msg });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length === 0) {
      return sock.sendMessage(jid, {
        text: '❌ Tag user yang ingin dikick!\n\nContoh: *!kick @user*',
      }, { quoted: msg });
    }

    for (const target of mentioned) {
      try {
        await sock.groupParticipantsUpdate(jid, [target], 'remove');
        await sock.sendMessage(jid, {
          text: `✅ @${getNumber(target)} telah dikick dari group.`,
          mentions: [target],
        });
      } catch (err) {
        await sock.sendMessage(jid, {
          text: `❌ Gagal kick @${getNumber(target)}: ${err.message}`,
          mentions: [target],
        });
      }
    }
  },
};
