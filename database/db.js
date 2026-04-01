const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");
const fs = require("fs-extra");

// Pastikan folder database ada
fs.ensureDirSync(path.join(__dirname, "../database"));

const adapter = new FileSync(path.join(__dirname, "../database/database.json"));
const db = low(adapter);

// ── Schema default ────────────────────────────────────
db.defaults({
  users: [],
  groups: [],
  premium: [],
  blocked: [],
  transactions: [],
  settings: { maintenance: false },
  shop: [
    {
      id: "shield",
      name: "🛡️ Perisai",
      price: 200,
      desc: "Lindungi dari rampok selama 24 jam",
      duration: 86400000,
    },
    {
      id: "pickaxe",
      name: "⛏️ Cangkul",
      price: 350,
      desc: "Bonus +50% koin dari daily",
      duration: 0,
    },
    {
      id: "sword",
      name: "⚔️ Pedang",
      price: 500,
      desc: "Tingkatkan peluang rampok +20%",
      duration: 0,
    },
    {
      id: "ring",
      name: "💍 Cincin Emas",
      price: 1000,
      desc: "Item langka — simbol status",
      duration: 0,
    },
    {
      id: "trophy",
      name: "🏆 Trofi",
      price: 2000,
      desc: "Item koleksi prestisius",
      duration: 0,
    },
  ],
}).write();

// ─────────────────────────────────────────────────────
// USER FUNCTIONS
// ─────────────────────────────────────────────────────

/**
 * Ambil atau buat data user baru
 */
function getUser(jid) {
  let user = db.get("users").find({ jid }).value();
  if (!user) {
    user = {
      jid,
      limit: 20,
      usedLimit: 0,
      lastReset: new Date().toDateString(),
      exp: 0,
      level: 1,
      coins: 0,
      inventory: [],
      premium: false,
      premiumExpiry: null,
      warnings: 0,
      lastActivity: Date.now(),
      banned: false,
      registeredAt: Date.now(),
    };
    db.get("users").push(user).write();
  }
  return user;
}

/**
 * Update data user
 */
function updateUser(jid, data) {
  db.get("users").find({ jid }).assign(data).write();
}

/**
 * Cek dan reset limit harian otomatis
 */
function checkAndResetLimit(jid) {
  const user = getUser(jid);
  const today = new Date().toDateString();
  if (user.lastReset !== today) {
    updateUser(jid, { usedLimit: 0, lastReset: today });
    return getUser(jid);
  }
  return user;
}

/**
 * Kurangi limit user
 */
function decreaseLimit(jid) {
  const user = checkAndResetLimit(jid);
  updateUser(jid, { usedLimit: user.usedLimit + 1 });
}

/**
 * Cek apakah user masih punya limit
 */
function hasLimit(jid, isPremium = false, isOwner = false) {
  if (isOwner) return true;
  const user = checkAndResetLimit(jid);
  const max = isPremium ? 100 : 20;
  return user.usedLimit < max;
}

// ─────────────────────────────────────────────────────
// PREMIUM FUNCTIONS
// ─────────────────────────────────────────────────────

function isPremium(jid) {
  const user = getUser(jid);
  if (!user.premium) return false;
  if (user.premiumExpiry && new Date() > new Date(user.premiumExpiry)) {
    updateUser(jid, { premium: false, premiumExpiry: null });
    return false;
  }
  return true;
}

function addPremium(jid, days) {
  const user = getUser(jid);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + parseInt(days));
  updateUser(jid, {
    premium: true,
    premiumExpiry: expiry.toISOString(),
    limit: 100,
  });
}

function removePremium(jid) {
  updateUser(jid, { premium: false, premiumExpiry: null, limit: 20 });
}

// ─────────────────────────────────────────────────────
// GROUP FUNCTIONS
// ─────────────────────────────────────────────────────

function getGroup(groupId) {
  let group = db.get("groups").find({ id: groupId }).value();
  if (!group) {
    group = {
      id: groupId,
      welcome: false,
      welcomeMsg: "Selamat datang @user di @group! 👋",
      goodbye: false,
      goodbyeMsg: "Selamat tinggal @user dari @group 👋",
      antilink: false,
      antispam: false,
      antitoxic: false,
      muted: false,
      rules: "",
    };
    db.get("groups").push(group).write();
  }
  return group;
}

function updateGroup(groupId, data) {
  db.get("groups").find({ id: groupId }).assign(data).write();
}

// ─────────────────────────────────────────────────────
// EXP & LEVEL SYSTEM
// ─────────────────────────────────────────────────────

function addExp(jid, amount) {
  const user = getUser(jid);
  const newExp = user.exp + amount;
  const newLevel = Math.floor(0.1 * Math.sqrt(newExp)) + 1;
  updateUser(jid, { exp: newExp, level: newLevel });
  return { leveled: newLevel > user.level, newLevel, newExp };
}

// ─────────────────────────────────────────────────────
// ECONOMY FUNCTIONS
// ─────────────────────────────────────────────────────

function addCoins(jid, amount) {
  const user = getUser(jid);
  updateUser(jid, { coins: user.coins + amount });
}

function removeCoins(jid, amount) {
  const user = getUser(jid);
  if (user.coins < amount) return false;
  updateUser(jid, { coins: user.coins - amount });
  return true;
}

// ─────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────

function getLeaderboard(type = "exp", limit = 10) {
  return db.get("users").orderBy([type], ["desc"]).take(limit).value();
}

// ─────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────

function getAllUsers() {
  return db.get("users").value();
}

function getBotStats() {
  return {
    totalUsers: db.get("users").size().value(),
    totalGroups: db.get("groups").size().value(),
    totalPremium: db.get("users").filter({ premium: true }).size().value(),
  };
}

// ─────────────────────────────────────────────────────
// BADGE / ACHIEVEMENT SYSTEM
// ─────────────────────────────────────────────────────

const BADGE_LIST = {
  // Bergabung
  newcomer: {
    id: "newcomer",
    emoji: "🌱",
    name: "Newcomer",
    desc: "Pertama kali menggunakan bot",
  },
  veteran: {
    id: "veteran",
    emoji: "🏅",
    name: "Veteran",
    desc: "Sudah bergabung lebih dari 30 hari",
  },
  // Level
  lvl5: {
    id: "lvl5",
    emoji: "⭐",
    name: "Rising Star",
    desc: "Mencapai level 5",
  },
  lvl10: { id: "lvl10", emoji: "🌟", name: "Star", desc: "Mencapai level 10" },
  lvl25: {
    id: "lvl25",
    emoji: "💫",
    name: "Legend",
    desc: "Mencapai level 25",
  },
  // Koin
  rich: { id: "rich", emoji: "💰", name: "Rich", desc: "Memiliki 1.000 koin" },
  millionaire: {
    id: "millionaire",
    emoji: "💎",
    name: "Millionaire",
    desc: "Memiliki 10.000 koin",
  },
  // Sosial
  married: {
    id: "married",
    emoji: "💍",
    name: "Married",
    desc: "Sudah menikah",
  },
  generous: {
    id: "generous",
    emoji: "🎁",
    name: "Generous",
    desc: "Mengirim hadiah 5 kali",
  },
  // Premium
  vip: { id: "vip", emoji: "👑", name: "VIP", desc: "Pengguna premium" },
};

function getUserBadges(jid) {
  const user = getUser(jid);
  return (user.badges || []).map((id) => BADGE_LIST[id]).filter(Boolean);
}

function awardBadge(jid, badgeId) {
  if (!BADGE_LIST[badgeId]) return false;
  const user = getUser(jid);
  const badges = user.badges || [];
  if (badges.includes(badgeId)) return false; // sudah punya
  badges.push(badgeId);
  updateUser(jid, { badges });
  return true;
}

function checkAndAwardBadges(jid) {
  const user = getUser(jid);
  const awarded = [];

  // Newcomer — selalu award saat pertama
  if (awardBadge(jid, "newcomer")) awarded.push("newcomer");

  // Veteran — bergabung > 30 hari
  const daysSince = (Date.now() - (user.registeredAt || Date.now())) / 86400000;
  if (daysSince >= 30 && awardBadge(jid, "veteran")) awarded.push("veteran");

  // Level badges
  if (user.level >= 5 && awardBadge(jid, "lvl5")) awarded.push("lvl5");
  if (user.level >= 10 && awardBadge(jid, "lvl10")) awarded.push("lvl10");
  if (user.level >= 25 && awardBadge(jid, "lvl25")) awarded.push("lvl25");

  // Koin badges
  if (user.coins >= 1000 && awardBadge(jid, "rich")) awarded.push("rich");
  if (user.coins >= 10000 && awardBadge(jid, "millionaire"))
    awarded.push("millionaire");

  // Premium
  if (user.premium && awardBadge(jid, "vip")) awarded.push("vip");

  return awarded.map((id) => BADGE_LIST[id]);
}

// ─────────────────────────────────────────────────────
// MARRIAGE SYSTEM
// ─────────────────────────────────────────────────────

// Schema: db.marriages = [{ id1, id2, marriedAt, proposalFrom }]
db.defaults({ marriages: [], proposals: [] }).write();

function getMarriage(jid) {
  return (
    db
      .get("marriages")
      .find((m) => m.id1 === jid || m.id2 === jid)
      .value() || null
  );
}

function getPartner(jid) {
  const m = getMarriage(jid);
  if (!m) return null;
  return m.id1 === jid ? m.id2 : m.id1;
}

function propose(fromJid, toJid) {
  // Cek sudah menikah
  if (getMarriage(fromJid))
    return { ok: false, reason: "already_married_self" };
  if (getMarriage(toJid))
    return { ok: false, reason: "already_married_target" };
  if (fromJid === toJid) return { ok: false, reason: "self_propose" };

  // Cek sudah ada proposal sebelumnya
  const existing = db
    .get("proposals")
    .find((p) => p.from === fromJid && p.to === toJid)
    .value();
  if (existing) return { ok: false, reason: "already_proposed" };

  db.get("proposals")
    .push({ from: fromJid, to: toJid, at: Date.now() })
    .write();
  return { ok: true };
}

function acceptMarriage(toJid) {
  const proposal = db
    .get("proposals")
    .find((p) => p.to === toJid)
    .value();
  if (!proposal) return { ok: false, reason: "no_proposal" };

  db.get("proposals")
    .remove((p) => p.to === toJid)
    .write();
  db.get("marriages")
    .push({ id1: proposal.from, id2: toJid, marriedAt: Date.now() })
    .write();

  awardBadge(proposal.from, "married");
  awardBadge(toJid, "married");

  return { ok: true, partner: proposal.from };
}

function rejectProposal(toJid) {
  const proposal = db
    .get("proposals")
    .find((p) => p.to === toJid)
    .value();
  if (!proposal) return { ok: false };
  db.get("proposals")
    .remove((p) => p.to === toJid)
    .write();
  return { ok: true, from: proposal.from };
}

function divorce(jid) {
  const m = getMarriage(jid);
  if (!m) return false;
  db.get("marriages")
    .remove((m2) => m2.id1 === m.id1 && m2.id2 === m.id2)
    .write();
  return true;
}

function getPendingProposal(jid) {
  return (
    db
      .get("proposals")
      .find((p) => p.to === jid)
      .value() || null
  );
}

// ─────────────────────────────────────────────────────
// GIFT SYSTEM
// ─────────────────────────────────────────────────────

function sendGift(fromJid, toJid, amount) {
  const from = getUser(fromJid);
  if (from.coins < amount) return { ok: false, reason: "insufficient" };
  if (amount <= 0) return { ok: false, reason: "invalid_amount" };
  if (fromJid === toJid) return { ok: false, reason: "self_gift" };

  removeCoins(fromJid, amount);
  addCoins(toJid, amount);

  // Hitung total hadiah yang dikirim
  const giftCount = (from.giftCount || 0) + 1;
  updateUser(fromJid, { giftCount });
  if (giftCount >= 5) awardBadge(fromJid, "generous");

  return { ok: true };
}

// ─────────────────────────────────────────────────────
// ECONOMY FUNCTIONS
// ─────────────────────────────────────────────────────

const DAILY_BASE = 100; // koin base harian
const DAILY_COOLDOWN = 86400000; // 24 jam

function claimDaily(jid) {
  const user = getUser(jid);
  const now = Date.now();
  const last = user.lastDaily || 0;
  const diff = now - last;

  if (diff < DAILY_COOLDOWN) {
    return { ok: false, remaining: DAILY_COOLDOWN - diff };
  }

  // Bonus streak
  const streak = (user.dailyStreak || 0) + 1;
  const bonus = Math.min(streak * 10, 200); // maks bonus 200
  const hasPickaxe = (user.inventory || []).includes("pickaxe");
  const total = Math.floor((DAILY_BASE + bonus) * (hasPickaxe ? 1.5 : 1));

  addCoins(jid, total);
  updateUser(jid, { lastDaily: now, dailyStreak: streak });

  return { ok: true, amount: total, streak, bonus };
}

function transfer(fromJid, toJid, amount) {
  if (fromJid === toJid) return { ok: false, reason: "self" };
  if (amount < 1) return { ok: false, reason: "invalid" };
  const from = getUser(fromJid);
  if (from.coins < amount) return { ok: false, reason: "insufficient" };
  removeCoins(fromJid, amount);
  addCoins(toJid, amount);
  return { ok: true };
}

// ── SHOP ─────────────────────────────────────────────

function getShopItems() {
  return db.get("shop").value();
}

function buyItem(jid, itemId) {
  const item = db.get("shop").find({ id: itemId }).value();
  if (!item) return { ok: false, reason: "not_found" };

  const user = getUser(jid);
  if (user.coins < item.price)
    return { ok: false, reason: "insufficient", need: item.price - user.coins };

  // Cek sudah punya (untuk non-consumable)
  const inv = user.inventory || [];
  if (inv.includes(itemId)) return { ok: false, reason: "already_owned" };

  removeCoins(jid, item.price);
  inv.push(itemId);
  updateUser(jid, { inventory: inv });

  return { ok: true, item };
}

function getInventory(jid) {
  const user = getUser(jid);
  const inv = user.inventory || [];
  const items = db.get("shop").value();
  return inv.map((id) => items.find((i) => i.id === id)).filter(Boolean);
}

// ── RAMPOK ────────────────────────────────────────────

function rob(fromJid, toJid) {
  const target = getUser(toJid);
  const robber = getUser(fromJid);

  if (fromJid === toJid) return { ok: false, reason: "self" };
  if (target.coins < 50) return { ok: false, reason: "too_poor" };

  // Cek perisai target
  const targetInv = target.inventory || [];
  if (targetInv.includes("shield")) {
    // Cek durasi perisai (24 jam sejak dibeli — simpan di shieldAt)
    const shieldAt = target.shieldAt || 0;
    if (Date.now() - shieldAt < 86400000) {
      return { ok: false, reason: "shielded" };
    }
    // Perisai kedaluwarsa, hapus
    updateUser(toJid, { inventory: targetInv.filter((i) => i !== "shield") });
  }

  // Cooldown rampok 30 menit
  const lastRob = robber.lastRob || 0;
  if (Date.now() - lastRob < 1800000) {
    return {
      ok: false,
      reason: "cooldown",
      remaining: 1800000 - (Date.now() - lastRob),
    };
  }

  // Peluang sukses: base 40%, +20% jika punya sword
  const hasSword = (robber.inventory || []).includes("sword");
  const successRate = hasSword ? 60 : 40;
  const success = Math.random() * 100 < successRate;

  updateUser(fromJid, { lastRob: Date.now() });

  if (success) {
    const stolen = Math.floor(target.coins * (Math.random() * 0.2 + 0.1)); // 10-30%
    removeCoins(toJid, stolen);
    addCoins(fromJid, stolen);
    return { ok: true, success: true, amount: stolen };
  } else {
    // Gagal: kena denda 50-100 koin
    const fine = Math.min(robber.coins, Math.floor(Math.random() * 51) + 50);
    removeCoins(fromJid, fine);
    addCoins(toJid, fine);
    return { ok: true, success: false, fine };
  }
}

// ─────────────────────────────────────────────────────
// ADMIN MANIPULASI LEVEL & KOIN
// ─────────────────────────────────────────────────────

function setCoins(jid, amount) {
  getUser(jid); // pastikan user ada
  updateUser(jid, { coins: Math.max(0, amount) });
}

function setLevel(jid, level) {
  getUser(jid);
  const lvl = Math.max(1, level);
  const exp = Math.pow((lvl - 1) * 10, 2); // exp minimum untuk level ini
  updateUser(jid, { level: lvl, exp });
}

function addCoinsDirect(jid, amount) {
  const user = getUser(jid);
  const newCoins = Math.max(0, (user.coins || 0) + amount);
  updateUser(jid, { coins: newCoins });
  return newCoins;
}

function addLevelDirect(jid, amount) {
  const user = getUser(jid);
  const newLevel = Math.max(1, (user.level || 1) + amount);
  const newExp = Math.pow((newLevel - 1) * 10, 2);
  updateUser(jid, { level: newLevel, exp: newExp });
  return newLevel;
}

// Backup & Restore database
const path_db = require("path");
const fs_db = require("fs-extra");

function backupDatabase() {
  const src = path_db.join(__dirname, "database.json");
  const dest = path_db.join(__dirname, "backup_" + Date.now() + ".json");
  fs_db.copySync(src, dest);
  return dest;
}

function restoreDatabase(backupPath) {
  const dest = path_db.join(__dirname, "database.json");
  fs_db.copySync(backupPath, dest);
  // Reload db
  db.read();
}

function listDatabaseBackups() {
  const dir = __dirname;
  const files = fs_db
    .readdirSync(dir)
    .filter((f) => f.startsWith("backup_") && f.endsWith(".json"));
  return files
    .sort()
    .reverse()
    .map((f) => ({
      name: f,
      path: path_db.join(dir, f),
      size: Math.round(fs_db.statSync(path_db.join(dir, f)).size / 1024),
      date: new Date(
        parseInt(f.replace("backup_", "").replace(".json", "")),
      ).toLocaleString("id-ID"),
    }));
}

module.exports = {
  db,
  getUser,
  updateUser,
  checkAndResetLimit,
  decreaseLimit,
  hasLimit,
  isPremium,
  addPremium,
  removePremium,
  getGroup,
  updateGroup,
  addExp,
  addCoins,
  removeCoins,
  getLeaderboard,
  getAllUsers,
  getBotStats,
  // Badge
  BADGE_LIST,
  getUserBadges,
  awardBadge,
  checkAndAwardBadges,
  // Marriage
  getMarriage,
  getPartner,
  propose,
  acceptMarriage,
  rejectProposal,
  divorce,
  getPendingProposal,
  // Gift
  sendGift,
  // Admin manipulasi
  setCoins,
  setLevel,
  addCoinsDirect,
  addLevelDirect,
  // Backup
  backupDatabase,
  restoreDatabase,
  listDatabaseBackups,
  // Economy
  claimDaily,
  transfer,
  getShopItems,
  buyItem,
  getInventory,
  rob,
  DAILY_BASE,
};
