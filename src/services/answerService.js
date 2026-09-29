const {
  compactText,
  findRelevantEntries,
  matchesTopicAlias,
} = require("../knowledge/retriever");

const SCOPE_REPLY =
  "ตอนนี้ผมตอบข้อมูลได้เฉพาะเรื่องทุนช้างเผือก ปีการศึกษา 2570 ของโรงเรียนส่วนบุญโญปถัมภ์ ลำพูนครับ\n\nลองถาม เช่น “สมัครวันไหน”, “ค่าสมัครเท่าไร”, “สอบวิชาอะไร” หรือ “ทุนได้กี่บาท”";

const HELP_REPLY =
  "ผมช่วยตอบคำถามเรื่องทุนช้างเผือก ปีการศึกษา 2570 ได้ครับ เช่น\n" +
  "• คุณสมบัติผู้สมัคร\n" +
  "• วันสมัครและค่าสมัคร\n" +
  "• วิชาสอบและตารางสอบ\n" +
  "• จำนวนทุนและเงื่อนไข GPAX\n" +
  "• การประกาศผลและเกียรติบัตร\n\n" +
  "พิมพ์คำถามได้เลยครับ";

const GREETING_REPLY =
  "สวัสดีครับ ผมเป็นผู้ช่วยข้อมูลโรงเรียนส่วนบุญโญปถัมภ์ ลำพูน ตอนนี้ตอบคำถามเกี่ยวกับทุนช้างเผือก ปีการศึกษา 2570 ได้ครับ\n\nอยากทราบเรื่องคุณสมบัติ วันสมัคร ค่าสมัคร วันสอบ หรือจำนวนทุน ถามได้เลยครับ";

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
      if (!compactQuestion) return HELP_REPLY;
      if (GREETINGS.has(compactQuestion)) return GREETING_REPLY;
      if (HELP_WORDS.has(compactQuestion)) return HELP_REPLY;

      let results = findRelevantEntries(question, knowledgeBase, { limit: 4 });
      const hasTopicAlias = matchesTopicAlias(question, knowledgeBase);
      if (results.length === 0 && hasTopicAlias) {
        results = [{ entry: topic.entries[0], score: 1 }];
      }
      if (results.length === 0) return SCOPE_REPLY;

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
        if (!aiResult.inScope) return SCOPE_REPLY;
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
  GREETING_REPLY,
  HELP_REPLY,
  SCOPE_REPLY,
  createAnswerService,
};

