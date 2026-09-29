const {
  compactText,
  findRelevantEntries,
  matchesTopicAlias,
} = require("../knowledge/retriever");

const GREETINGS = new Set(["สวัสดี", "สวัสดีครับ", "หวัดดี", "hello", "hi"]);
const HELP_WORDS = new Set(["ช่วยเหลือ", "help", "เมนู", "ถามอะไรได้บ้าง"]);
const SHORT_PRICE_QUESTIONS = new Set(["ราคา", "เท่าไหร่", "กี่บาท", "ค่าใช้จ่าย"]);
const UNCLEAR_QUESTION =
  "🤔 ขออภัยครับ ผมยังไม่เข้าใจคำถาม\n\n" +
  "ตอนนี้ผมช่วยตอบได้เฉพาะเรื่องทุนช้างเผือกครับ\n" +
  "ลองถามเช่น\n" +
  "• สมัครทุนวันไหน\n" +
  "• ค่าสมัครเท่าไหร่\n" +
  "• ทุนได้กี่บาท";

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

      if (SHORT_PRICE_QUESTIONS.has(compactQuestion)) {
        return (
          "❓ ต้องการถามราคาเรื่องไหนครับ?\n\n" +
          "💳 ค่าสมัครสอบ: 150 บาท\n" +
          "🐘 มูลค่าทุน: 6,000 บาทต่อปี\n\n" +
          "ลองพิมพ์ “ค่าสมัครเท่าไหร่” หรือ “ทุนได้กี่บาท” ครับ"
        );
      }

      if (compactQuestion.includes("อายุ")) {
        return (
          "📌 ประกาศทุนไม่ได้กำหนดเป็นอายุโดยตรง แต่กำหนดตามระดับชั้นครับ\n\n" +
          "• ทุนระดับ ม.1: กำลังเรียน ป.4–ป.6\n" +
          "• ทุนระดับ ม.4: กำลังเรียน ม.1–ม.3"
        );
      }

      let results = findRelevantEntries(question, knowledgeBase, { limit: 4 });
      const hasTopicAlias = matchesTopicAlias(question, knowledgeBase);
      if (results.length === 0 && hasTopicAlias) {
        results = [{ entry: topic.entries[0], score: 1 }];
      }
      if (!aiEnabled || !aiAnswerer) {
        return results.length > 0 ? fallbackAnswer(results, topic) : UNCLEAR_QUESTION;
      }

      const rate = rateLimiter.check(sourceKey);
      if (!rate.allowed) {
        logger.info("ai_rate_limited");
        return results.length > 0 ? fallbackAnswer(results, topic) : UNCLEAR_QUESTION;
      }

      try {
        const sourceEntries = results.length > 0
          ? results.map((result) => result.entry)
          : topic.entries;
        const aiResult = await aiAnswerer({
          entries: sourceEntries,
          question,
          topicTitle: topic.title,
        });
        if (!aiResult.inScope) return UNCLEAR_QUESTION;
        logger.info("ai_answer_created", {
          entryCount: aiResult.usedEntryIds.length,
          model: aiResult.model,
        });
        return appendSource(aiResult.answerThai, topic);
      } catch (error) {
        logger.error("ai_answer_failed", {
          errorCode: error.code ?? "AI_ERROR",
        });
        return results.length > 0 ? fallbackAnswer(results, topic) : UNCLEAR_QUESTION;
      }
    },
  };
}

module.exports = {
  createAnswerService,
};

