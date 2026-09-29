const fs = require("node:fs");
const path = require("node:path");

const CHAT_MODES = Object.freeze({
  GENERAL: "general",
  SCHOLARSHIP: "scholarship",
  ADMIN: "admin",
});

const MODE_LABELS = Object.freeze({
  [CHAT_MODES.GENERAL]: "คำถามทั่วไป",
  [CHAT_MODES.SCHOLARSHIP]: "ทุนช้างเผือก",
  [CHAT_MODES.ADMIN]: "ติดต่อแอดมิน",
});

const MODE_BY_TEXT = new Map([
  ["1", CHAT_MODES.GENERAL],
  ["ทั่วไป", CHAT_MODES.GENERAL],
  ["คำถามทั่วไป", CHAT_MODES.GENERAL],
  ["ถามทั่วไป", CHAT_MODES.GENERAL],
  ["ถามเรื่องทั่วไป", CHAT_MODES.GENERAL],
  ["เรื่องทั่วไป", CHAT_MODES.GENERAL],
  ["2", CHAT_MODES.SCHOLARSHIP],
  ["ทุน", CHAT_MODES.SCHOLARSHIP],
  ["ทุนช้างเผือก", CHAT_MODES.SCHOLARSHIP],
  ["ถามทุน", CHAT_MODES.SCHOLARSHIP],
  ["ถามเรื่องทุน", CHAT_MODES.SCHOLARSHIP],
  ["ถามเรื่องทุนช้างเผือก", CHAT_MODES.SCHOLARSHIP],
  ["เรื่องทุน", CHAT_MODES.SCHOLARSHIP],
  ["3", CHAT_MODES.ADMIN],
  ["แอดมิน", CHAT_MODES.ADMIN],
  ["ติดต่อแอดมิน", CHAT_MODES.ADMIN],
  ["คุยกับแอดมิน", CHAT_MODES.ADMIN],
  ["ถามแอดมิน", CHAT_MODES.ADMIN],
]);

function normalizeSelection(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u200b]+/g, " ")
    .trim();
}

function parseModeSelection(value) {
  return MODE_BY_TEXT.get(normalizeSelection(value)) ?? null;
}

function parseModePostback(data) {
  const params = new URLSearchParams(String(data ?? ""));
  const mode = params.get("mode");
  return Object.values(CHAT_MODES).includes(mode) ? mode : null;
}

function loadRecords(persistPath) {
  if (!persistPath) return new Map();
  try {
    const parsed = JSON.parse(fs.readFileSync(persistPath, "utf8"));
    return new Map(
      Object.entries(parsed).filter(
        ([, record]) =>
          record &&
          Object.values(CHAT_MODES).includes(record.mode) &&
          Number.isFinite(record.expiresAt) &&
          Number.isFinite(record.updatedAt)
      )
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not load mode store: ${error.message}`);
    }
    return new Map();
  }
}

function persistRecords(records, persistPath) {
  if (!persistPath) return;
  fs.mkdirSync(path.dirname(persistPath), { recursive: true });
  const temporaryPath = `${persistPath}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(Object.fromEntries(records)),
    "utf8"
  );
  fs.renameSync(temporaryPath, persistPath);
}

function createModeStore({
  ttlMs = 24 * 60 * 60 * 1000,
  persistPath = null,
} = {}) {
  const records = loadRecords(persistPath);

  return {
    get(key, now = Date.now()) {
      const record = records.get(key);
      if (!record || record.expiresAt <= now) {
        records.delete(key);
        persistRecords(records, persistPath);
        return CHAT_MODES.GENERAL;
      }
      record.expiresAt = now + ttlMs;
      return record.mode;
    },
    set(key, mode, now = Date.now()) {
      if (!Object.values(CHAT_MODES).includes(mode)) {
        throw new Error(`Unknown chat mode: ${mode}`);
      }
      const existing = records.get(key);
      if (existing && now < existing.updatedAt) {
        return existing.mode;
      }
      records.set(key, { mode, expiresAt: now + ttlMs, updatedAt: now });
      persistRecords(records, persistPath);
      return mode;
    },
  };
}

module.exports = {
  CHAT_MODES,
  MODE_LABELS,
  createModeStore,
  normalizeSelection,
  parseModePostback,
  parseModeSelection,
};

