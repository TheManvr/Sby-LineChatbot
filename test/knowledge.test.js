const assert = require("node:assert/strict");
const test = require("node:test");
const { loadKnowledgeBase } = require("../src/knowledge/loadKnowledgeBase");

test("loads the scholarship knowledge base with traceable source pages", () => {
  const knowledgeBase = loadKnowledgeBase();
  assert.equal(knowledgeBase.topics.length, 1);
  assert.equal(knowledgeBase.topics[0].id, "white-elephant-scholarship-2570");
  assert.ok(knowledgeBase.entries.length >= 15);
  assert.ok(
    knowledgeBase.entries.every(
      (entry) => entry.sourcePages.length > 0 && entry.answer.length > 0
    )
  );
});

