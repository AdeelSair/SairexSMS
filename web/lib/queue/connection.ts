import IORedis from "ioredis";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;

  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
  });

  connection.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return connection;
}
