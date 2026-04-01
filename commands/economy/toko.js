"use strict";

const {
  getShopItems,
  buyItem,
  getInventory,
  getUser,
} = require("../../database/db");

module.exports = {
  name: "toko",
  alias: ["shop", "store", "beli"],
  category: "economy",
  description: "Toko item virtual — beli dengan koin",
  usage: ".toko | .toko beli <id_item> | .toko inventory",

  async run({ sock, msg, jid, sender, args, usedPrefix }) {
    const sub = args[0]?.toLowerCase();

    // ── .toko inventory ───────────────────────────────
    if (sub === "inventory" || sub === "inv" || sub === "tas") {
      const items = getInventory(sender);
      if (!items.length) {
        return sock.sendMessage(
          jid,
          {
            text: `🎒 *Inventori kamu kosong!*\n\nBeli item di toko: *${usedPrefix}toko*`,
          },
          { quoted: msg },
        );
      }
      const list = items.map((i) => `${i.name}\n   └ ${i.desc}`).join("\n\n");
      return sock.sendMessage(
        jid,
        {
          text: `🎒 *Inventori Kamu*\n\n${list}`,
        },
        { quoted: msg },
      );
    }

    // ── .toko beli <id> ───────────────────────────────
    if (sub === "beli" || sub === "buy") {
      const itemId = args[1]?.toLowerCase();
      if (!itemId) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Masukkan ID item!\nContoh: *${usedPrefix}toko beli shield*\n\nLihat daftar: *${usedPrefix}toko*`,
          },
          { quoted: msg },
        );
      }

      const result = buyItem(sender, itemId);
      const user = getUser(sender);

      if (!result.ok) {
        const msgs = {
          not_found: `❌ Item *${itemId}* tidak ditemukan!\nLihat daftar: *${usedPrefix}toko*`,
          insufficient: `❌ Koin tidak cukup!\nKoin kamu: *${user.coins}* | Kurang: *${result.need}* koin`,
          already_owned: `❌ Kamu sudah punya item ini!`,
        };
        return sock.sendMessage(
          jid,
          { text: msgs[result.reason] || "❌ Gagal beli!" },
          { quoted: msg },
        );
      }

      const item = result.item;
      return sock.sendMessage(
        jid,
        {
          text: `✅ *Pembelian Berhasil!*\n\n${item.name}\n📋 ${item.desc}\n💰 Harga: ${item.price.toLocaleString("id-ID")} koin\n\n💼 Sisa koin: ${getUser(sender).coins.toLocaleString("id-ID")}`,
        },
        { quoted: msg },
      );
    }

    // ── .toko — tampilkan semua item ──────────────────
    const items = getShopItems();
    const userInv = getUser(sender).inventory || [];
    const userCoins = getUser(sender).coins;

    const list = items
      .map((item) => {
        const owned = userInv.includes(item.id) ? " ✅" : "";
        const canAfford = userCoins >= item.price ? "" : " ❌";
        return `${item.name}${owned}\n   ├ ${item.desc}\n   ├ 💰 Harga : ${item.price.toLocaleString("id-ID")} koin${canAfford}\n   └ 🆔 ID    : \`${item.id}\``;
      })
      .join("\n\n");

    await sock.sendMessage(
      jid,
      {
        text: `🏪 *Toko Item*\n💰 Koin kamu: ${userCoins.toLocaleString("id-ID")}\n\n${list}\n\n📦 Cara beli:\n*${usedPrefix}toko beli <id>*\n\n🎒 Lihat inventori:\n*${usedPrefix}toko inventory*`,
      },
      { quoted: msg },
    );
  },
};
