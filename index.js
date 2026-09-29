require("dotenv").config({ quiet: true });

const { createServer } = require("./src/app");
const { readConfig } = require("./src/config");
const { loadKnowledgeBase } = require("./src/knowledge/loadKnowledgeBase");
const { createLogger } = require("./src/logger");
const { createRateLimiter } = require("./src/rateLimiter");
const { createAnswerService } = require("./src/services/answerService");
const { createOpenAIAnswerer } = require("./src/services/openaiAnswerer");

const config = readConfig();
const logger = createLogger();
const knowledgeBase = loadKnowledgeBase();
const rateLimiter = createRateLimiter({ limit: config.aiRequestsPerHour });
const aiAnswerer = config.aiEnabled
  ? createOpenAIAnswerer({
      apiKey: config.openaiApiKey,
      model: config.openaiModel,
    })
  : null;
const answerService = createAnswerService({
  aiAnswerer,
  aiEnabled: config.aiEnabled,
  knowledgeBase,
  logger,
  rateLimiter,
});

const { server } = createServer({ answerService, config, knowledgeBase, logger });

function shutdown(signal) {
  logger.info("server_stopping", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

