function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u200b]+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/[^\p{L}\p{M}\p{N}%]+/gu, "");
}

function keywordScore(questionCompact, keyword) {
  const compactKeyword = compactText(keyword);
  if (!compactKeyword || !questionCompact.includes(compactKeyword)) return 0;
  return Math.max(2, Math.min(12, [...compactKeyword].length));
}

function findRelevantEntries(question, knowledgeBase, options = {}) {
  const questionCompact = compactText(question);
  const limit = options.limit ?? 4;

  return knowledgeBase.entries
    .map((entry) => {
      const keywordTotal = entry.keywords.reduce(
        (score, keyword) => score + keywordScore(questionCompact, keyword),
        0
      );
      const titleBonus = questionCompact.includes(compactText(entry.title)) ? 10 : 0;
      return { entry, score: keywordTotal + titleBonus };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit);
}

function matchesTopicAlias(question, knowledgeBase) {
  const questionCompact = compactText(question);
  return knowledgeBase.topics.some((topic) =>
    topic.aliases.some((alias) => questionCompact.includes(compactText(alias)))
  );
}

module.exports = {
  compactText,
  findRelevantEntries,
  matchesTopicAlias,
  normalizeText,
};

