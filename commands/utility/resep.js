"use strict";

const axios = require("axios");

// TheMealDB API - gratis, no key
async function searchRecipe(query) {
  const res = await axios.get(
    `https://www.themealdb.com/api/json/v1/1/search.php`,
    {
      params: { s: query },
      timeout: 10000,
    },
  );
  return res.data?.meals || null;
}

async function getRecipeById(id) {
  const res = await axios.get(
    `https://www.themealdb.com/api/json/v1/1/lookup.php`,
    {
      params: { i: id },
      timeout: 10000,
    },
  );
  return res.data?.meals?.[0] || null;
}

// Ambil bahan-bahan dari objek meal
function getIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push(`• ${measure ? measure.trim() + " " : ""}${ing.trim()}`);
    }
  }
  return ingredients;
}

module.exports = {
  name: "resep",
  alias: ["recipe", "masakan", "masak"],
  category: "utility",
  description: "Cari resep masakan",
  usage: ".resep <nama masakan>",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `🍳 *Cari Resep Masakan*\n\nContoh:\n• \`${usedPrefix}resep nasi goreng\`\n• \`${usedPrefix}resep chicken\`\n• \`${usedPrefix}resep pasta\`\n\n_Pencarian dalam Bahasa Inggris lebih akurat_`,
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      jid,
      { text: `🔍 Mencari resep *${fullArgs}*...` },
      { quoted: msg },
    );

    const meals = await searchRecipe(fullArgs);

    if (!meals || meals.length === 0) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Resep *${fullArgs}* tidak ditemukan!\n\nCoba gunakan nama dalam Bahasa Inggris.\nContoh: \`${usedPrefix}resep fried rice\``,
        },
        { quoted: msg },
      );
    }

    // Jika lebih dari 1 hasil
    if (meals.length > 1) {
      const list = meals
        .slice(0, 8)
        .map((m, i) => `${i + 1}. ${m.strMeal} (${m.strArea || "Unknown"})`)
        .join("\n");
      return sock.sendMessage(
        jid,
        {
          text: `🍽️ *Ditemukan ${meals.length} resep:*\n\n${list}\n\n_Ketik lebih spesifik untuk langsung lihat resep_\nContoh: \`${usedPrefix}resep ${meals[0].strMeal}\``,
        },
        { quoted: msg },
      );
    }

    // Satu hasil - tampilkan detail
    const meal = meals[0];
    const ingredients = getIngredients(meal);
    const instructions = meal.strInstructions
      ? meal.strInstructions
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .slice(0, 1200)
      : "Tidak tersedia";

    const text = `🍽️ *${meal.strMeal}*
🌍 Asal: ${meal.strArea || "-"} | 🏷️ Kategori: ${meal.strCategory || "-"}

🧂 *Bahan-bahan (${ingredients.length}):*
${ingredients.join("\n")}

👨‍🍳 *Cara Memasak:*
${instructions}${meal.strInstructions?.length > 1200 ? "\n\n_...terpotong. Lihat lengkap di YouTube_" : ""}

${meal.strYoutube ? `▶️ Video: ${meal.strYoutube}` : ""}`.trim();

    // Kirim dengan thumbnail jika ada
    if (meal.strMealThumb) {
      try {
        const imgRes = await axios.get(meal.strMealThumb, {
          responseType: "arraybuffer",
          timeout: 8000,
        });
        return sock.sendMessage(
          jid,
          {
            image: Buffer.from(imgRes.data),
            caption: text,
          },
          { quoted: msg },
        );
      } catch {
        /* fallback teks */
      }
    }

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
