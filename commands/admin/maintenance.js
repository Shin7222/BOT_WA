const config = require('../../config');

module.exports = {
  name: 'maintenance',
  alias: ['maint'],
  category: 'admin',
  description: 'Toggle maintenance mode',
  usage: '!maintenance on/off',
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid, args }) {
    const state = args[0]?.toLowerCase();
    if (!state || !['on', 'off'].includes(state)) {
      return sock.sendMessage(jid, {
        text: `⚙️ Status maintenance: *${config.maintenance ? 'ON' : 'OFF'}*\n\nGunakan:\n• *!maintenance on* — aktifkan\n• *!maintenance off* — nonaktifkan`,
      }, { quoted: msg });
    }

    config.maintenance = state === 'on';
    await sock.sendMessage(jid, {
      text: `⚙️ Mode maintenance *${state.toUpperCase()}*!\n${
        config.maintenance
          ? '🔴 Bot tidak akan merespons user lain.'
          : '🟢 Bot kembali aktif normal.'
      }`,
    }, { quoted: msg });
  },
};
