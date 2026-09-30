const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_MESSAGES = 8;

function createConversationStore({
  ttlMs = DEFAULT_TTL_MS,
  maxMessages = DEFAULT_MAX_MESSAGES,
} = {}) {
  const conversations = new Map();

  function conversationKey(userKey, mode) {
    return `${userKey}:${mode}`;
  }

  function prune(now) {
    for (const [key, conversation] of conversations) {
      if (conversation.expiresAt <= now) conversations.delete(key);
    }
  }

  return {
    get(userKey, mode, now = Date.now()) {
      prune(now);
      const key = conversationKey(userKey, mode);
      const conversation = conversations.get(key);
      if (!conversation) return [];
      conversation.expiresAt = now + ttlMs;
      return conversation.messages.map((message) => ({ ...message }));
    },
    append(userKey, mode, userText, assistantText, now = Date.now()) {
      prune(now);
      const key = conversationKey(userKey, mode);
      const conversation = conversations.get(key) ?? { messages: [] };
      conversation.messages.push(
        { role: "user", content: userText },
        { role: "assistant", content: assistantText }
      );
      conversation.messages = conversation.messages.slice(-maxMessages);
      conversation.expiresAt = now + ttlMs;
      conversations.set(key, conversation);
    },
    clearUser(userKey) {
      for (const key of conversations.keys()) {
        if (key.startsWith(`${userKey}:`)) conversations.delete(key);
      }
    },
  };
}

module.exports = { createConversationStore };
