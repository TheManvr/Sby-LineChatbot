const path = require("node:path");
require("dotenv").config({ quiet: true });

const { createServer } = require("./src/app");
const { createConversationStore } = require("./src/conversationStore");
const { readConfig } = require("./src/config");
const { loadKnowledgeBase } = require("./src/knowledge/loadKnowledgeBase");
const { createLogger } = require("./src/logger");
const { createRateLimiter } = require("./src/rateLimiter");
const { createAnswerService } = require("./src/services/answerService");
const { createGeneralAnswerer } = require("./src/services/generalAnswerer");
const { createModeStore } = require("./src/modeStore");
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
const generalAnswerer = config.aiEnabled && config.generalModeEnabled
  ? createGeneralAnswerer({
      apiKey: config.openaiApiKey,
      model: config.openaiModel,
    })
  : null;
const modeStore = createModeStore({
  persistPath:
    process.env.MODE_STORE_PATH ||
    path.join(process.cwd(), ".runtime", "modes.json"),
});
const conversationStore = createConversationStore();
const answerService = createAnswerService({
  aiAnswerer,
  aiEnabled: config.aiEnabled,
  knowledgeBase,
  logger,
  rateLimiter,
});
const { server } = createServer({
  answerService,
  config,
  conversationStore,
  generalAnswerer,
  knowledgeBase,
  logger,
  modeStore,
  rateLimiter,
});

function shutdown(signal) {
  logger.info("server_stopping", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

