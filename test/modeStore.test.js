const assert = require("node:assert/strict");
const test = require("node:test");
const {
  CHAT_MODES,
  createModeStore,
  parseModePostback,
  parseModeSelection,
} = require("../src/modeStore");

test("parses menu postbacks and text fallbacks", () => {
  assert.equal(parseModePostback("mode=general"), CHAT_MODES.GENERAL);
  assert.equal(parseModePostback("mode=scholarship"), CHAT_MODES.SCHOLARSHIP);
  assert.equal(parseModePostback("mode=admin"), CHAT_MODES.ADMIN);
  assert.equal(parseModeSelection("2"), CHAT_MODES.SCHOLARSHIP);
  assert.equal(parseModeSelection("ติดต่อแอดมิน"), CHAT_MODES.ADMIN);
  assert.equal(parseModeSelection("คำถามที่ไม่ใช่เมนู"), null);
});

test("stores a mode per user and defaults to general", () => {
  const store = createModeStore({ ttlMs: 1000 });
  assert.equal(store.get("user-a", 0), CHAT_MODES.GENERAL);
  store.set("user-a", CHAT_MODES.SCHOLARSHIP, 0);
  assert.equal(store.get("user-a", 500), CHAT_MODES.SCHOLARSHIP);
  assert.equal(store.get("user-a", 1501), CHAT_MODES.GENERAL);
});

test("does not let an older event overwrite the latest mode", () => {
  const store = createModeStore({ ttlMs: 1000 });
  store.set("user-a", CHAT_MODES.ADMIN, 2000);
  store.set("user-a", CHAT_MODES.GENERAL, 1000);
  assert.equal(store.get("user-a", 2001), CHAT_MODES.ADMIN);
});

