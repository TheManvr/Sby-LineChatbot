const crypto = require("node:crypto");
const express = require("express");
const line = require("@line/bot-sdk");
const { version } = require("../package.json");

function sourceKeyFor(event) {
  const sourceId =
    event.source?.userId ?? event.source?.groupId ?? event.source?.roomId ?? "unknown";
  return crypto.createHash("sha256").update(sourceId).digest("hex");
}

function textMessage(text) {
  return { type: "text", text: text.slice(0, 5000) };
}

function createServer({ answerService, config, knowledgeBase, logger }) {
  const app = express();
  app.set("trust proxy", 1);

  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: config.channelAccessToken,
  });

  async function reply(replyToken, text) {
    return client.replyMessage({
      replyToken,
      messages: [textMessage(text)],
    });
  }

  async function handleEvent(event) {
    const startedAt = Date.now();

    if (event.type === "follow") {
      logger.info("follow_ignored");
      return;
    }

    if (event.type !== "message") return;

    if (event.message.type !== "text") {
      logger.info("message_ignored", { reason: "non_text" });
      return;
    }

    const answer = await answerService.answer(
      event.message.text,
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

