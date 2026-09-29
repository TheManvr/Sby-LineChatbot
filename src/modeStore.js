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
  ["2", CHAT_MODES.SCHOLARSHIP],
  ["ทุน", CHAT_MODES.SCHOLARSHIP],
  ["ทุนช้างเผือก", CHAT_MODES.SCHOLARSHIP],
  ["3", CHAT_MODES.ADMIN],
  ["แอดมิน", CHAT_MODES.ADMIN],
  ["ติดต่อแอดมิน", CHAT_MODES.ADMIN],
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

function createModeStore({ ttlMs = 24 * 60 * 60 * 1000 } = {}) {
  const records = new Map();

  return {
    get(key, now = Date.now()) {
      const record = records.get(key);
      if (!record || record.expiresAt <= now) {
        records.delete(key);
        return CHAT_MODES.GENERAL;
      }
      record.expiresAt = now + ttlMs;
      return record.mode;
    },
    set(key, mode, now = Date.now()) {
      if (!Object.values(CHAT_MODES).includes(mode)) {
        throw new Error(`Unknown chat mode: ${mode}`);
      }
      records.set(key, { mode, expiresAt: now + ttlMs });
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

