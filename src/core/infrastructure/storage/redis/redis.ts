import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on("connect", () => {
  console.log("[Redis] Connected to cache/queue server.");
});

redisConnection.on("error", (err) => {
  console.error("[Redis] Connection failed:", err.message);
});
