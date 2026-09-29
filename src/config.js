function readPositiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function readConfig() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const aiEnabled = /^(1|true|yes)$/i.test(
    process.env.AI_ANALYSIS_ENABLED ?? "false"
  );
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!channelAccessToken || !channelSecret) {
    throw new Error(
      "Missing LINE credentials. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET."
    );
  }

  if (aiEnabled && !openaiApiKey) {
    throw new Error(
      "AI_ANALYSIS_ENABLED is true, but OPENAI_API_KEY is missing."
    );
  }

  return {
    aiEnabled,
    aiRequestsPerHour: readPositiveInteger(
      process.env.AI_REQUESTS_PER_HOUR,
      30,
      200
    ),
    channelAccessToken,
    channelSecret,
    openaiApiKey,
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-nano",
    port: readPositiveInteger(process.env.PORT, 3000, 65535),
  };
}

module.exports = { readConfig };

