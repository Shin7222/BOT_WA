const { getBotStats } = require('../../database/db');
const { formatUptime } = require('../../utils/helper');
const config = require('../../config');
const os = require('os');

module.exports = {
  name: 'stats',
  alias: ['status', 'botinfo'],
  category: 'admin',
  description: 'Statistik bot',
  usage: '!stats',
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid }) {
    const stats = getBotStats();
    const uptime = formatUptime(process.uptime() * 1000);
    const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const modeEmoji = config.botMode === 'private' ? '🔒' : '🌐';

    const text = `
📊 *Bot Statistics*

👥 *Users:*
├ Total: ${stats.totalUsers}
├ Premium: ${stats.totalPremium}
└ Groups: ${stats.totalGroups}

💻 *System:*
├ Uptime: ${uptime}
├ RAM: ${memUsed} MB used
├ RAM Total: ${memTotal} MB
├ CPU Load: ${cpuLoad}
└ Node.js: ${process.version}

⚙️ *Mode:*
├ Bot Mode: ${modeEmoji} ${config.botMode.toUpperCase()}
├ Maintenance: ${config.maintenance ? '🔴 ON' : '🟢 OFF'}
└ Platform: ${process.platform}
`.trim();

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
