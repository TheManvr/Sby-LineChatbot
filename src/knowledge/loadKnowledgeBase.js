const fs = require("node:fs");
const path = require("node:path");

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function validateTopic(topic, fileName) {
  assertNonEmptyString(topic.id, `${fileName}: id`);
  assertNonEmptyString(topic.title, `${fileName}: title`);
  if (topic.enabled !== true) {
    throw new Error(`${fileName}: enabled must be true for a loaded topic`);
  }
  if (!Array.isArray(topic.aliases) || topic.aliases.length === 0) {
    throw new Error(`${fileName}: aliases must not be empty`);
  }
  if (!Array.isArray(topic.entries) || topic.entries.length === 0) {
    throw new Error(`${fileName}: entries must not be empty`);
  }

  const ids = new Set();
  for (const entry of topic.entries) {
    assertNonEmptyString(entry.id, `${fileName}: entry id`);
    assertNonEmptyString(entry.title, `${fileName}: entry ${entry.id} title`);
    assertNonEmptyString(entry.answer, `${fileName}: entry ${entry.id} answer`);
    if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
      throw new Error(`${fileName}: entry ${entry.id} keywords must not be empty`);
    }
    if (!Array.isArray(entry.sourcePages) || entry.sourcePages.length === 0) {
      throw new Error(`${fileName}: entry ${entry.id} sourcePages must not be empty`);
    }
    if (ids.has(entry.id)) {
      throw new Error(`${fileName}: duplicate entry id ${entry.id}`);
    }
    ids.add(entry.id);
  }

  return topic;
}

function loadKnowledgeBase(directory = path.join(__dirname, "..", "..", "data", "topics")) {
  const files = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No knowledge files found in ${directory}`);
  }

  const topics = files.map((fileName) => {
    const fullPath = path.join(directory, fileName);
    const topic = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    return validateTopic(topic, fileName);
  });

  return {
    entries: topics.flatMap((topic) =>
      topic.entries.map((entry) => ({
        ...entry,
        topicId: topic.id,
        topicTitle: topic.title,
      }))
    ),
    topics,
  };
}

module.exports = { loadKnowledgeBase, validateTopic };

