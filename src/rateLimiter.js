function createRateLimiter({ limit, windowMs = 60 * 60 * 1000 }) {
  const buckets = new Map();

  return {
    check(key, now = Date.now()) {
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1 };
      }

      if (current.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
        };
      }

      current.count += 1;
      return { allowed: true, remaining: limit - current.count };
    },
  };
}

module.exports = { createRateLimiter };

