module.exports = {
  name: 'calc',
  alias: ['kalkulator', 'hitung'],
  category: 'tools',
  description: 'Kalkulator matematika',
  usage: '!calc 2 + 2',

  async run({ sock, msg, jid, fullArgs }) {
    if (!fullArgs) {
      return sock.sendMessage(jid, {
        text: '❌ Masukkan ekspresi matematika!\n\nContoh: *!calc 10 * 5 + 3*',
      }, { quoted: msg });
    }

    try {
      // Sanitasi: hanya izinkan karakter aman
      const expr = fullArgs.replace(/[^0-9+\-*/.()%\s]/g, '');
      if (!expr.trim()) throw new Error('Ekspresi tidak valid');

      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();

      if (!isFinite(result)) throw new Error('Hasil tidak valid (pembagian nol?)');

      await sock.sendMessage(jid, {
        text: `🧮 *Kalkulator*\n\n📥 Input: \`${fullArgs}\`\n📤 Hasil: *${result}*`,
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ Ekspresi tidak valid!\n\nContoh:\n• !calc 10 + 5\n• !calc (3 * 4) / 2\n• !calc 100 % 7`,
      }, { quoted: msg });
    }
  },
};
