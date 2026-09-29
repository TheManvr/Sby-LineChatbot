const { loadKnowledgeBase } = require("../src/knowledge/loadKnowledgeBase");

const knowledgeBase = loadKnowledgeBase();
const summary = knowledgeBase.topics.map((topic) => ({
  id: topic.id,
  entries: topic.entries.length,
  source: topic.source.displayName,
}));

console.log(JSON.stringify({ status: "ok", topics: summary }, null, 2));

