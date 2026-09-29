const assert = require("node:assert/strict");
const test = require("node:test");
const { loadKnowledgeBase } = require("../src/knowledge/loadKnowledgeBase");
const { findRelevantEntries } = require("../src/knowledge/retriever");

const knowledgeBase = loadKnowledgeBase();

const cases = [
  ["ค่าสมัครเท่าไหร่", "application-fee"],
  ["สอบวันไหน", "exam-dates"],
  ["สอบกี่โมง", "exam-schedule"],
  ["ต้องรักษาเกรดเท่าไหร่", "scholarship-value-and-maintenance"],
  ["ต้องเอาบัตรอะไรไปสอบ", "exam-identification"],
  ["ผลสอบประกาศเมื่อไหร่", "results-and-tiebreak"],
  ["ป.5 สมัครได้ไหม", "eligibility-m1"],
  ["ม.2 สมัครได้ไหม", "eligibility-m4"]
];

for (const [question, expectedId] of cases) {
  test(`retrieves ${expectedId} for: ${question}`, () => {
    const results = findRelevantEntries(question, knowledgeBase);
    assert.equal(results[0]?.entry.id, expectedId);
  });
}

test("does not retrieve scholarship data for an unrelated school question", () => {
  const results = findRelevantEntries("เข็มขัดนักเรียนชายราคาเท่าไร", knowledgeBase);
  assert.equal(results.length, 0);
});

