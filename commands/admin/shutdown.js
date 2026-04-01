"use strict";

module.exports = {
  name: "shutdown",
  alias: ["off", "matikan"],
  category: "admin",
  description: "Matikan bot (owner only)",
  usage: ".shutdown",
  ownerOnly: true,
  useLimit: false,

  async run({ sock, msg, jid }) {
    await sock.sendMessage(
      jid,
      {
        text: "🔴 *Bot dimatikan...*\nSampai jumpa! 👋",
      },
      { quoted: msg },
    );

    // Beri jeda agar pesan terkirim dulu sebelum proses berhenti
    setTimeout(() => process.exit(0), 2000);
  },
};
