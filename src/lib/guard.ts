import { timingSafeEqual } from "node:crypto";

// Protects the paid API routes on a public deployment:
// 1. Invite code: if WANDER_INVITE_CODE is set, every request must send it.
// 2. Per-visitor daily limits, keyed by IP.
//
// The limit counters live in memory, so on Vercel (several instances, restarts)
// they're approximate: good enough to stop one person or bot burning credit,
// not an exact quota. Move them to Redis (e.g. Upstash) for exact limits.

export type Action = "plan" | "replan" | "tiktok";

const DAILY_LIMITS: Record<Action, number> = {
  plan: Number(process.env.WANDER_DAILY_PLANS ?? 5),
  replan: Number(process.env.WANDER_DAILY_REPLANS ?? 20),
  tiktok: Number(process.env.WANDER_DAILY_TIKTOK ?? 40),
};

const DAY_MS = 24 * 60 * 60 * 1000;
const counters = new Map<string, { count: number; resetAt: number }>();

function codeMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function visitorId(req: Request) {
  // Vercel sets x-forwarded-for; the first entry is the real client.
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Returns an error Response if the request isn't allowed, or null to proceed. */
export function guard(req: Request, action: Action): Response | null {
  const expected = process.env.WANDER_INVITE_CODE?.trim();
  if (expected) {
    const given = req.headers.get("x-wander-code")?.trim() ?? "";
    if (!codeMatches(given.toUpperCase(), expected.toUpperCase())) {
      return Response.json({ error: "invite_required", message: "Enter your invite code to plan trips." }, { status: 401 });
    }
  }

  const key = `${action}:${visitorId(req)}`;
  const now = Date.now();
  const entry = counters.get(key);
  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + DAY_MS });
  } else if (entry.count >= DAILY_LIMITS[action]) {
    const hours = Math.ceil((entry.resetAt - now) / (60 * 60 * 1000));
    const what = action === "tiktok" ? "TikTok imports" : action === "replan" ? "day changes" : "new trips";
    return Response.json(
      { error: "rate_limited", message: `You've reached today's limit for ${what}. Try again in about ${hours}h.` },
      { status: 429 },
    );
  } else {
    entry.count++;
  }

  // Keep the map from growing forever on a long-lived instance.
  if (counters.size > 10_000) for (const [k, v] of counters) if (v.resetAt <= now) counters.delete(k);
  return null;
}
