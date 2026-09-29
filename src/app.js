const crypto = require("node:crypto");
const express = require("express");
const line = require("@line/bot-sdk");
const { version } = require("../package.json");
const { createAdminRelay } = require("./services/adminRelay");
const {
  CHAT_MODES,
  MODE_LABELS,
  parseModePostback,
  parseModeSelection,
} = require("./modeStore");

function sourceKeyFor(event) {
  const sourceId =
    event.source?.userId ?? event.source?.groupId ?? event.source?.roomId ?? "unknown";
  return crypto.createHash("sha256").update(sourceId).digest("hex");
}

function sourceIdFor(event) {
  return event.source?.userId ?? event.source?.groupId ?? event.source?.roomId ?? null;
}

const ID_COMMANDS = new Set(["/my-id", "รหัสฉัน"]);

function textMessage(text) {
  return { type: "text", text: text.slice(0, 5000) };
}

function createServer({
  answerService,
  config,
  generalAnswerer,
  knowledgeBase,
  logger,
  modeStore,
  rateLimiter,
}) {
  const app = express();
  app.set("trust proxy", 1);

  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: config.channelAccessToken,
  });
  const adminRelay = createAdminRelay({
    adminUserId: config.adminUserId,
    client,
    logger,
  });

  async function reply(replyToken, text) {
    return client.replyMessage({
      replyToken,
      messages: [textMessage(text)],
    });
  }

  function modeConfirmation(mode) {
    if (mode === CHAT_MODES.GENERAL) {
      return "เลือกโหมดคำถามทั่วไปแล้วครับ พิมพ์คำถามเกี่ยวกับโรงเรียนได้เลยครับ";
    }
    if (mode === CHAT_MODES.SCHOLARSHIP) {
      return "เลือกโหมดทุนช้างเผือกแล้วครับ ผมจะตอบต่อเนื่องในหัวข้อนี้จนกว่าจะเลือกเมนูอื่นครับ";
    }
    return "เลือกโหมดติดต่อแอดมินแล้วครับ พิมพ์ข้อความที่ต้องการฝากถึงแอดมินได้เลย AI จะไม่ตอบเนื้อหานั้นครับ";
  }

  async function setMode(event, mode) {
    modeStore.set(sourceKeyFor(event), mode);
    await reply(event.replyToken, modeConfirmation(mode));
  }

  async function handleAdminCommand(event, text) {
    if (!config.adminUserId || event.source?.userId !== config.adminUserId) {
      return false;
    }
    const command = adminRelay.parseReplyCommand(text);
    if (!command) return false;
    const result = await adminRelay.replyToTicket(command);
    await reply(
      event.replyToken,
      result.ok
        ? "ส่งคำตอบให้ผู้ใช้แล้วครับ"
        : "ไม่พบ ticket นี้หรือส่งข้อความไม่สำเร็จครับ"
    );
    return true;
  }

  async function handleEvent(event) {
    const startedAt = Date.now();

    if (event.type === "follow") {
      logger.info("follow_ignored");
      return;
    }

    if (event.type === "postback") {
      const mode = parseModePostback(event.postback?.data);
      if (mode) await setMode(event, mode);
      return;
    }

    if (event.type !== "message") return;

    if (event.message.type !== "text") {
      logger.info("message_ignored", { reason: "non_text" });
      return;
    }

    const text = event.message.text.trim();
    if (ID_COMMANDS.has(text.toLowerCase())) {
      const sourceId = sourceIdFor(event);
      await reply(
        event.replyToken,
        sourceId
          ? `LINE user ID ของคุณคือ ${sourceId}`
          : "ไม่พบ LINE user ID จากข้อความนี้ครับ"
      );
      return;
    }

    const selectedMode = parseModeSelection(text);
    if (selectedMode) {
      await setMode(event, selectedMode);
      return;
    }

    if (await handleAdminCommand(event, text)) return;

    const currentMode = modeStore.get(sourceKeyFor(event));
    if (currentMode === CHAT_MODES.ADMIN) {
      const userId = sourceIdFor(event);
      if (!adminRelay.configured || !userId) {
        await reply(event.replyToken, adminRelay.getNotConfigured());
        return;
      }
      const ticketId = await adminRelay.forward({ userId, text });
      if (ticketId) {
        await reply(event.replyToken, adminRelay.getAck());
      } else {
        await reply(event.replyToken, adminRelay.getNotConfigured());
      }
      return;
    }

    if (currentMode === CHAT_MODES.GENERAL) {
      if (!generalAnswerer || !config.aiEnabled) {
        await reply(
          event.replyToken,
          "โหมดคำถามทั่วไปยังไม่ได้เปิดใช้งาน AI ครับ หากต้องการข้อมูลทุนช้างเผือกให้เลือกเมนู 2"
        );
        return;
      }
      const rate = rateLimiter.check(sourceKeyFor(event));
      if (!rate.allowed) {
        await reply(event.replyToken, "โหมด AI ถึงขีดจำกัดชั่วคราว กรุณาลองใหม่ภายหลังครับ");
        return;
      }
      try {
        const generalEntries = knowledgeBase.entries.filter(
          (entry) => entry.topicId !== knowledgeBase.topics[0]?.id
        );
        const result = await generalAnswerer({
          question: text,
          sourceEntries: generalEntries,
        });
        if (result.switchToScholarship) {
          await reply(event.replyToken, "คำถามนี้เกี่ยวกับทุนช้างเผือกครับ กรุณาเลือกเมนู 2");
        } else if (result.shouldReply && result.answerThai.trim()) {
          await reply(event.replyToken, result.answerThai);
        }
      } catch (error) {
        logger.error("general_ai_failed", {
          errorCode: error.code ?? "AI_ERROR",
        });
        await reply(event.replyToken, "ตอนนี้ระบบ AI โหมดทั่วไปขัดข้อง กรุณาลองใหม่หรือติดต่อแอดมินครับ");
      }
      return;
    }

    const answer = await answerService.answer(
      text,
      sourceKeyFor(event)
    );
    if (answer == null) {
      logger.info("message_ignored", { reason: "out_of_scope" });
      return;
    }
    await reply(event.replyToken, answer);
    logger.info("message_processed", {
      durationMs: Date.now() - startedAt,
      messageType: event.message.type,
    });
  }

  app.get("/", (_req, res) => {
    res.status(200).send("SBY LINE Chatbot is running.");
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "sby-line-chatbot",
      version,
      uptimeSeconds: Math.floor(process.uptime()),
      ai: {
        enabled: config.aiEnabled,
        model: config.aiEnabled ? config.openaiModel : null,
        requestsPerUserPerHour: config.aiEnabled
          ? config.aiRequestsPerHour
          : null,
      },
      adminRelay: {
        configured: adminRelay.configured,
      },
      modes: Object.values(CHAT_MODES).map((mode) => ({
        id: mode,
        label: MODE_LABELS[mode],
      })),
      knowledge: knowledgeBase.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        entries: topic.entries.length,
      })),
    });
  });

  app.post("/webhook", line.middleware({ channelSecret: config.channelSecret }), (req, res) => {
    const events = req.body?.events ?? [];
    res.sendStatus(200);

    void Promise.all(events.map(handleEvent)).catch((error) => {
      logger.error("webhook_processing_failed", {
        errorCode: error.code ?? "PROCESSING_ERROR",
      });
    });
  });

  app.use((error, _req, res, _next) => {
    const status = error instanceof line.SignatureValidationFailed ? 401 : 500;
    logger.error("webhook_rejected", { status });
    res.sendStatus(status);
  });

  const server = app.listen(config.port, () => {
    logger.info("server_started", {
      aiEnabled: config.aiEnabled,
      knowledgeTopics: knowledgeBase.topics.length,
      port: config.port,
    });
  });

  return { app, server };
}

module.exports = { createServer, sourceKeyFor, textMessage };

