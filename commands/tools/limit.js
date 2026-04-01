const { getUser, isPremium: checkPremium } = require('../../database/db');
const { progressBar } = require('../../utils/helper');
const moment = require('moment');

module.exports = {
  name: 'limit',
  alias: ['ceklimit'],
  category: 'tools',
  description: 'Cek sisa limit command harian',
  usage: '!limit',
  useLimit: false,

  async run({ sock, msg, jid, sender, usedPrefix, isOwner }) {
    const user = getUser(sender);
    const premium = checkPremium(sender);
    const maxLimit = isOwner ? '∞' : premium ? 100 : 20;
    const used = user.usedLimit || 0;
    const remaining = isOwner ? '∞' : Math.max(0, (premium ? 100 : 20) - used);
    const bar = isOwner ? '████████' : progressBar(used, premium ? 100 : 20, 8);

    const resetTime = moment().endOf('day').fromNow();

    const text = `
📊 *Limit Harian Kamu*

${bar} ${isOwner ? '∞' : `${used}/${maxLimit}`}

├ Terpakai: ${used}
├ Sisa: ${remaining}
├ Maks: ${maxLimit}
└ Reset: ${resetTime}

${isOwner ? '👑 Kamu adalah owner, limit unlimited!' :
  premium ? '⭐ Kamu adalah premium user!' :
  `💡 Upgrade ke *premium* untuk limit lebih besar!\nKetik *${usedPrefix}premium* untuk info.`}
`.trim();

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
