const { getAllUsers } = require('../../database/db');
const { sleep } = require('../../utils/helper');
const logger = require('../../utils/logger');

module.exports = {
  name: 'broadcast',
  alias: ['bc'],
  category: 'admin',
  description: 'Broadcast pesan ke semua user',
  usage: '!broadcast <pesan>',
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid, fullArgs }) {
    if (!fullArgs) {
      return sock.sendMessage(jid, {
        text: '❌ Masukkan pesan broadcast!\n\nContoh: *!broadcast Halo semua! Bot update baru!*',
      }, { quoted: msg });
    }

    const users = getAllUsers();
    let success = 0, failed = 0;

    await sock.sendMessage(jid, {
      text: `📡 Memulai broadcast ke *${users.length} user*...\nMohon tunggu...`,
    }, { quoted: msg });

    for (const user of users) {
      try {
        await sock.sendMessage(user.jid, {
          text: `📢 *Broadcast dari Admin Bot*\n\n${fullArgs}`,
        });
        success++;
        // Delay antar pesan broadcast (sangat penting anti-ban!)
        await sleep(2000, 4000);
      } catch (err) {
        failed++;
        logger.warn(`Broadcast gagal ke ${user.jid}: ${err.message}`);
      }
    }

    await sock.sendMessage(jid, {
      text: `✅ *Broadcast selesai!*\n\n📤 Terkirim: ${success}\n❌ Gagal: ${failed}\n📊 Total: ${users.length}`,
    }, { quoted: msg });
  },
};
