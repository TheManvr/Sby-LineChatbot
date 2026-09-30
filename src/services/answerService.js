const {
  compactText,
  findRelevantEntries,
  matchesTopicAlias,
} = require("../knowledge/retriever");

const GREETINGS = new Set(["สวัสดี", "หวัดดี", "hello", "hi", "hey"]);
const HELP_WORDS = new Set(["ช่วยเหลือ", "help", "เมนู", "ถามอะไรได้บ้าง"]);
const SHORT_PRICE_QUESTIONS = new Set(["ราคา", "เท่าไหร่", "กี่บาท", "ค่าใช้จ่าย"]);
const WELCOME_MESSAGE =
  "สวัสดีครับ 😊\n\n" +
  "มีอะไรให้ช่วยเรื่องทุนช้างเผือกไหมครับ?\n" +
  "ถามได้ทั้งคุณสมบัติ วันสมัคร เอกสาร ค่าสมัคร และมูลค่าทุนครับ";
const UNCLEAR_QUESTION =
  "🤔 ขออภัยครับ ผมยังไม่เข้าใจคำถาม\n\n" +
  "ตอนนี้ผมช่วยตอบได้เฉพาะเรื่องทุนช้างเผือกครับ\n" +
  "ลองถามเช่น\n" +
  "• สมัครทุนวันไหน\n" +
  "• ค่าสมัครเท่าไหร่\n" +
  "• ทุนได้กี่บาท\n\n" +
  "💬 ถามต่อเรื่องทุนช้างเผือกได้เลยครับ";

function appendSource(answer, topic) {
  return (
    `${answer.trim()}\n\nอ้างอิง: ${topic.source.displayName}` +
    "\n\n💬 สอบถามเรื่องทุนช้างเผือกเพิ่มเติมได้เลยครับ"
  );
}

function fallbackAnswer(results, topic) {
  const primary = results[0]?.entry ?? topic.entries[0];
  return appendSource(primary.answer, topic);
}

function isGreeting(compactQuestion) {
  const normalized = compactQuestion.replace(/(ครับผม|ครับ|ค่ะ|คะ|จ้า|จ้ะ|นะ)+$/u, "");
  return GREETINGS.has(normalized);
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
    async answer(question, sourceKey = "anonymous", history = []) {
      const compactQuestion = compactText(question);
      // Empty webhook text has no useful content to answer.
      if (!compactQuestion) return null;
      if (isGreeting(compactQuestion)) return WELCOME_MESSAGE;
      if (HELP_WORDS.has(compactQuestion)) return WELCOME_MESSAGE;

      if (SHORT_PRICE_QUESTIONS.has(compactQuestion)) {
        return (
          "❓ ต้องการถามราคาเรื่องไหนครับ?\n\n" +
          "💳 ค่าสมัครสอบ: 150 บาท\n" +
          "🐘 มูลค่าทุน: 6,000 บาทต่อปี\n\n" +
          "ลองพิมพ์ “ค่าสมัครเท่าไหร่” หรือ “ทุนได้กี่บาท” ครับ\n\n" +
          "💬 ถามต่อเรื่องทุนช้างเผือกได้เลยครับ"
        );
      }

      if (compactQuestion.includes("อายุ")) {
        return (
          "📌 ประกาศทุนไม่ได้กำหนดเป็นอายุโดยตรง แต่กำหนดตามระดับชั้นครับ\n\n" +
          "• ทุนระดับ ม.1: กำลังเรียน ป.4–ป.6\n" +
          "• ทุนระดับ ม.4: กำลังเรียน ม.1–ม.3\n\n" +
          "💬 สอบถามเรื่องทุนช้างเผือกเพิ่มเติมได้เลยครับ"
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
          history,
          question,
          topicTitle: topic.title,
        });
        if (!aiResult.inScope) return UNCLEAR_QUESTION;
        logger.info("ai_answer_created", {
          entryCount: aiResult.usedEntryIds.length,
          model: aiResult.model,
        });
        if (aiResult.conversational) {
          return `${aiResult.answerThai.trim()}\n\n💬 ถามต่อเรื่องทุนช้างเผือกได้เลยครับ`;
        }
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

