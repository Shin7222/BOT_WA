"use strict";

const axios = require("axios");

/* =========================
   AI PROVIDERS
========================= */

// ===== OpenAI =====
async function askOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY belum di set");

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    },
    { headers: { Authorization: `Bearer ${key}` } },
  );

  return res.data.choices?.[0]?.message?.content;
}

// ===== Gemini =====
async function askGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum di set");

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
    { contents: [{ parts: [{ text: prompt }] }] },
  );

  return res.data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// ===== Claude =====
async function askClaude(prompt) {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error("CLAUDE_API_KEY belum di set");

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    },
  );

  return res.data.content?.[0]?.text;
}

// ===== Grok (xAI) =====
async function askGrok(prompt) {
  const key = process.env.GROK_API_KEY;
  if (!key) throw new Error("GROK_API_KEY belum di set");

  const res = await axios.post(
    "https://api.x.ai/v1/chat/completions",
    {
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );

  return res.data.choices?.[0]?.message?.content;
}

// ===== Groq (FAST & GRATIS) =====
async function askGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY belum di set");

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );

  return res.data.choices?.[0]?.message?.content;
}

// ===== OpenRouter =====
async function askOpenRouter(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY belum di set");

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );

  return res.data.choices?.[0]?.message?.content;
}

// ===== Ollama (LOCAL AI) =====
async function askLocalAI(prompt) {
  const res = await axios.post("http://localhost:11434/api/generate", {
    model: "llama3",
    prompt,
    stream: false,
  });

  return res.data.response;
}

/* =========================
   COMMAND
========================= */

module.exports = {
  name: "ai",
  alias: ["gpt", "ask"],
  category: "ai",
  description: "AI multi provider lengkap 🔥",
  usage: ".ai [provider] <teks>",
  useLimit: true,
  cooldown: 3000,

  async run({ sock, msg, jid, args, usedPrefix, senderNumber }) {
    if (!args.length) {
      return sock.sendMessage(
        jid,
        {
          text:
            `Contoh:\n` +
            `${usedPrefix}ai halo\n` +
            `${usedPrefix}ai groq cepat banget\n` +
            `${usedPrefix}ai local offline ai\n`,
        },
        { quoted: msg },
      );
    }

    let provider = "auto";
    let prompt = args.join(" ");

    const first = args[0].toLowerCase();

    const providers = [
      "openai",
      "gemini",
      "claude",
      "grok",
      "groq",
      "openrouter",
      "local",
    ];

    if (providers.includes(first)) {
      provider = first;
      prompt = args.slice(1).join(" ");
    }

    await sock.sendMessage(jid, { text: "⏳ AI berpikir..." }, { quoted: msg });

    try {
      let result;

      if (provider === "openai") result = await askOpenAI(prompt);
      else if (provider === "gemini") result = await askGemini(prompt);
      else if (provider === "claude") result = await askClaude(prompt);
      else if (provider === "grok") result = await askGrok(prompt);
      else if (provider === "groq") result = await askGroq(prompt);
      else if (provider === "openrouter") result = await askOpenRouter(prompt);
      else if (provider === "local") result = await askLocalAI(prompt);
      else {
        // AUTO SUPER FALLBACK 🔥
        try {
          result = await askLocalAI(prompt);
          provider = "Local AI";
        } catch {
          try {
            result = await askGroq(prompt);
            provider = "Groq";
          } catch {
            try {
              result = await askOpenRouter(prompt);
              provider = "OpenRouter";
            } catch {
              try {
                result = await askGemini(prompt);
                provider = "Gemini";
              } catch {
                result = "❌ Semua AI gagal / limit habis";
              }
            }
          }
        }
      }

      await sock.sendMessage(
        jid,
        {
          text: `🤖 *AI (${provider})*\n\n${result}`,
          mentions: [`${senderNumber}@s.whatsapp.net`],
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ Error AI:\n" + (err.message || "Unknown error"),
        },
        { quoted: msg },
      );
    }
  },
};
