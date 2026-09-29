const assert = require("node:assert/strict");
const test = require("node:test");
const { createAdminRelay, parseAdminReplyCommand } = require("../src/services/adminRelay");

test("parses admin reply commands", () => {
  assert.deepEqual(parseAdminReplyCommand("ตอบ T12AB34 สวัสดีครับ"), {
    ticketId: "T12AB34",
    message: "สวัสดีครับ",
  });
  assert.equal(parseAdminReplyCommand("ตอบไม่ครบ"), null);
});

test("forwards a ticket and lets admin reply", async () => {
  const pushed = [];
  const relay = createAdminRelay({
    adminUserId: "admin-user",
    client: {
      async pushMessage(payload) {
        pushed.push(payload);
      },
    },
    logger: { error() {} },
  });

  const ticketId = await relay.forward({ userId: "student-user", text: "ขอสอบถามครับ" });
  assert.match(ticketId, /^T[0-9A-F]{6}$/);
  assert.equal(pushed[0].to, "admin-user");
  const result = await relay.replyToTicket({ ticketId, message: "แอดมินตอบแล้วครับ" });
  assert.deepEqual(result, { ok: true });
  assert.equal(pushed[1].to, "student-user");
});

