const {
  compactText,
  findRelevantEntries,
  matchesTopicAlias,
} = require("../knowledge/retriever");

const GREETINGS = new Set(["สวัสดี", "สวัสดีครับ", "หวัดดี", "hello", "hi"]);
const HELP_WORDS = new Set(["ช่วยเหลือ", "help", "เมนู", "ถามอะไรได้บ้าง"]);

function appendSource(answer, topic) {
  return `${answer.trim()}\n\nอ้างอิง: ${topic.source.displayName}`;
}

function fallbackAnswer(results, topic) {
  const primary = results[0]?.entry ?? topic.entries[0];
  return appendSource(primary.answer, topic);
}

function createAnswerService({
  aiAnswerer,
  aiEnabled,
  knowledgeBase,
  logger,
  rateLimiter,
}) {
  const topic = knowledgeBase.topics[0];

  return {
    async answer(question, sourceKey = "anonymous") {
      const compactQuestion = compactText(question);
      // Return null for anything outside the current scholarship topic. The
      // webhook deliberately does not reply so a school administrator can
      // answer general questions manually.
      if (!compactQuestion) return null;
      if (GREETINGS.has(compactQuestion)) return null;
      if (HELP_WORDS.has(compactQuestion)) return null;

      let results = findRelevantEntries(question, knowledgeBase, { limit: 4 });
      const hasTopicAlias = matchesTopicAlias(question, knowledgeBase);
      if (results.length === 0 && hasTopicAlias) {
        results = [{ entry: topic.entries[0], score: 1 }];
      }
      if (results.length === 0) return null;

      if (!aiEnabled || !aiAnswerer) {
        return fallbackAnswer(results, topic);
      }

      const rate = rateLimiter.check(sourceKey);
      if (!rate.allowed) {
        logger.info("ai_rate_limited");
        return fallbackAnswer(results, topic);
      }

      try {
        const aiResult = await aiAnswerer({
          entries: results.map((result) => result.entry),
          question,
          topicTitle: topic.title,
        });
        if (!aiResult.inScope) return null;
        logger.info("ai_answer_created", {
          entryCount: aiResult.usedEntryIds.length,
          model: aiResult.model,
        });
        return appendSource(aiResult.answerThai, topic);
      } catch (error) {
        logger.error("ai_answer_failed", {
          errorCode: error.code ?? "AI_ERROR",
        });
        return fallbackAnswer(results, topic);
      }
    },
  };
}

module.exports = {
  createAnswerService,
};

