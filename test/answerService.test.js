const assert = require("node:assert/strict");
const test = require("node:test");
const { loadKnowledgeBase } = require("../src/knowledge/loadKnowledgeBase");
const { createAnswerService } = require("../src/services/answerService");

function silentLogger() {
  return { error() {}, info() {} };
}

function allowAllLimiter() {
  return { check: () => ({ allowed: true }) };
}

test("answers a known question without AI", async () => {
  const service = createAnswerService({
    aiAnswerer: null,
    aiEnabled: false,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  const answer = await service.answer("ค่าสมัครเท่าไหร่");
  assert.match(answer, /150 บาท/);
  assert.match(answer, /511-6-05613-9/);
  assert.match(answer, /อ้างอิง:/);
});

test("handles short price and age questions in scholarship mode", async () => {
  const service = createAnswerService({
    aiAnswerer: null,
    aiEnabled: false,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  assert.match(await service.answer("ราคา"), /ค่าสมัครสอบ: 150 บาท/);
  assert.match(await service.answer("อายุเท่าไร"), /ทุนระดับ ม.1/);
});

test("gives feedback for an out-of-scope question", async () => {
  const service = createAnswerService({
    aiAnswerer: null,
    aiEnabled: false,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  assert.match(await service.answer("เข็มขัดนักเรียนชายราคาเท่าไร"), /ยังไม่เข้าใจคำถาม/);
});

test("stays silent for greetings and help requests", async () => {
  const service = createAnswerService({
    aiAnswerer: null,
    aiEnabled: false,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  assert.equal(await service.answer("สวัสดีครับ"), null);
  assert.equal(await service.answer("ช่วยเหลือ"), null);
});

test("falls back to verified data if AI fails", async () => {
  const service = createAnswerService({
    aiAnswerer: async () => {
      throw Object.assign(new Error("test failure"), { code: "TEST_FAILURE" });
    },
    aiEnabled: true,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  const answer = await service.answer("ทุนได้กี่บาท");
  assert.match(answer, /6,000 บาท/);
  assert.match(answer, /18,000 บาท/);
});

test("uses a grounded AI answer when available", async () => {
  const service = createAnswerService({
    aiAnswerer: async ({ entries }) => ({
      inScope: true,
      answerThai: "สมัครได้ตั้งแต่ 15 ตุลาคม ถึง 15 พฤศจิกายน 2569 ครับ",
      usedEntryIds: [entries[0].id],
      model: "test-model",
    }),
    aiEnabled: true,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  const answer = await service.answer("สมัครวันไหน");
  assert.match(answer, /15 ตุลาคม/);
  assert.match(answer, /อ้างอิง:/);
});

test("lets AI classify a question when keyword retrieval finds nothing", async () => {
  let receivedEntryCount = 0;
  const service = createAnswerService({
    aiAnswerer: async ({ entries }) => {
      receivedEntryCount = entries.length;
      return {
        inScope: true,
        answerThai: "เปิดรับสมัครวันที่ 15 ตุลาคม 2569 ครับ",
        usedEntryIds: [entries.find((entry) => entry.id === "application-period").id],
        model: "test-model",
      };
    },
    aiEnabled: true,
    knowledgeBase: loadKnowledgeBase(),
    logger: silentLogger(),
    rateLimiter: allowAllLimiter(),
  });
  const answer = await service.answer("ช่วงเวลาของการยื่นเอกสารเป็นอย่างไรครับ");
  assert.equal(receivedEntryCount, 17);
  assert.match(answer, /15 ตุลาคม/);
});

