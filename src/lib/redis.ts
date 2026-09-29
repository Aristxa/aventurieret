import { Redis } from "@upstash/redis";

// Upstash Redis, provisioned through the Vercel Marketplace (sets KV_REST_API_*).
// Returns null when not configured (e.g. local dev without `vercel env pull`),
// so features degrade instead of crashing.
let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis === undefined) {
    const configured =
      (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);
    redis = configured ? Redis.fromEnv() : null;
  }
  return redis;
}
