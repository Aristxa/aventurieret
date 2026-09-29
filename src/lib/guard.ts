import { timingSafeEqual } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

// Protects the paid API routes on a public deployment:
// 1. Invite code: if WANDER_INVITE_CODE is set, every request must send it.
// 2. Per-visitor daily limits, keyed by IP. Exact when Redis is configured;
//    otherwise counted in memory, which is only approximate on Vercel
//    (several instances, restarts).

export type Action = "plan" | "replan" | "tiktok" | "share";

const DAILY_LIMITS: Record<Action, number> = {
  plan: Number(process.env.WANDER_DAILY_PLANS ?? 5),
  replan: Number(process.env.WANDER_DAILY_REPLANS ?? 20),
  tiktok: Number(process.env.WANDER_DAILY_TIKTOK ?? 40),
  share: Number(process.env.WANDER_DAILY_SHARES ?? 50),
};

const LABELS: Record<Action, string> = {
  plan: "new trips",
  replan: "day changes",
  tiktok: "TikTok imports",
  share: "shared links",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const memory = new Map<string, { count: number; resetAt: number }>();
let limiters: Record<Action, Ratelimit> | null | undefined;

function redisLimiters() {
  if (limiters === undefined) {
    const redis = getRedis();
    limiters = redis
      ? (Object.fromEntries(
          (Object.keys(DAILY_LIMITS) as Action[]).map((a) => [
            a,
            new Ratelimit({ redis, prefix: `wander:rl:${a}`, limiter: Ratelimit.fixedWindow(DAILY_LIMITS[a], "1 d") }),
          ]),
        ) as Record<Action, Ratelimit>)
      : null;
  }
  return limiters;
}

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function visitorId(req: Request) {
  // Vercel sets x-forwarded-for; the first entry is the real client.
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Returns ms until the visitor may retry, or 0 if this request is allowed (and counted). */
async function limited(action: Action, visitor: string): Promise<number> {
  const rl = redisLimiters();
  if (rl) {
    try {
      const { success, reset } = await rl[action].limit(visitor);
      return success ? 0 : Math.max(reset - Date.now(), 60_000);
    } catch (err) {
      // Don't take the app down if Redis hiccups; fall back to memory.
      console.error("[guard] redis limit failed", err);
    }
  }
  const key = `${action}:${visitor}`;
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + DAY_MS });
  } else if (entry.count >= DAILY_LIMITS[action]) {
    return entry.resetAt - now;
  } else {
    entry.count++;
  }
  // Keep the map from growing forever on a long-lived instance.
  if (memory.size > 10_000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  return 0;
}

/** Returns an error Response if the request isn't allowed, or null to proceed. */
export async function guard(req: Request, action: Action): Promise<Response | null> {
  const expected = process.env.WANDER_INVITE_CODE?.trim();
  if (expected) {
    const given = req.headers.get("x-wander-code")?.trim() ?? "";
    if (!codeMatches(given.toUpperCase(), expected.toUpperCase())) {
      return Response.json({ error: "invite_required", message: "Enter your invite code to plan trips." }, { status: 401 });
    }
  }

  const waitMs = await limited(action, visitorId(req));
  if (waitMs > 0) {
    const hours = Math.max(1, Math.ceil(waitMs / (60 * 60 * 1000)));
    return Response.json(
      { error: "rate_limited", message: `You've reached today's limit for ${LABELS[action]}. Try again in about ${hours}h.` },
      { status: 429 },
    );
  }
  return null;
}
