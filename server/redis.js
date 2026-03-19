import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

let redisUrl = process.env.REDIS_URL || '';
redisUrl = redisUrl.replace(/["']/g, ''); // Remove any stray quotes

if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
  redisUrl = redisUrl.replace('redis://', 'rediss://');
}

const redisClient = createClient({
  url: redisUrl || undefined
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

await redisClient.connect();

export default redisClient;
