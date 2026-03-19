import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.replace(/^redis:\/\//, "rediss://") : undefined;

const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: true // important for deployment
  }
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

await redisClient.connect();

export default redisClient;
