"use strict";

const axios = require("axios");

// Emoji berdasarkan kode cuaca OpenWeatherMap
function weatherEmoji(code) {
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 400) return "🌦️";
  if (code >= 500 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800) return "☀️";
  if (code > 800) return "⛅";
  return "🌡️";
}

function windDir(deg) {
  const dirs = [
    "↑ Utara",
    "↗ TL",
    "→ Timur",
    "↘ TG",
    "↓ Selatan",
    "↙ BD",
    "← Barat",
    "↖ BL",
  ];
  return dirs[Math.round(deg / 45) % 8];
}

module.exports = {
  name: "cuaca",
  alias: ["weather", "cekcuaca"],
  category: "tools",
  description: "Cek cuaca suatu kota",
  usage: ".cuaca <nama kota>",

  async run({ sock, msg, jid, fullArgs, usedPrefix }) {
    if (!fullArgs) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Masukkan nama kota!\nContoh: *${usedPrefix}cuaca Jakarta*`,
        },
        { quoted: msg },
      );
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ WEATHER_API_KEY belum diisi di .env!\nDaftar gratis di: https://openweathermap.org/api`,
        },
        { quoted: msg },
      );
    }

    try {
      const res = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            q: fullArgs,
            appid: apiKey,
            units: "metric",
            lang: "id",
          },
          timeout: 8000,
        },
      );

      const d = res.data;
      const emoji = weatherEmoji(d.weather[0].id);
      const desc = d.weather[0].description;
      const temp = d.main.temp.toFixed(1);
      const feels = d.main.feels_like.toFixed(1);
      const humidity = d.main.humidity;
      const windSpeed = (d.wind.speed * 3.6).toFixed(1); // m/s → km/h
      const windDeg = windDir(d.wind.deg);
      const visibility = d.visibility
        ? `${(d.visibility / 1000).toFixed(1)} km`
        : "-";
      const city = `${d.name}, ${d.sys.country}`;
      const sunrise = new Date(d.sys.sunrise * 1000).toLocaleTimeString(
        "id-ID",
        { hour: "2-digit", minute: "2-digit" },
      );
      const sunset = new Date(d.sys.sunset * 1000).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const text = `${emoji} *Cuaca ${city}*

🌤️ Kondisi  : ${desc}
🌡️ Suhu     : ${temp}°C (terasa ${feels}°C)
💧 Lembab   : ${humidity}%
💨 Angin    : ${windSpeed} km/h ${windDeg}
👁️ Jarak    : ${visibility}
🌅 Matahari : Terbit ${sunrise} | Terbenam ${sunset}

_Diperbarui: ${new Date().toLocaleString("id-ID")}_`;

      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ Kota *${fullArgs}* tidak ditemukan!\nCoba gunakan nama dalam bahasa Inggris, contoh: *Surabaya*, *Bandung*`,
          },
          { quoted: msg },
        );
      }
      throw err;
    }
  },
};
