import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getRedis } from "./redis";
import { PlanSchema, TripRequestSchema } from "./types";

// Shared trips are read-only snapshots in Redis. Whoever creates a share gets
// an edit token (kept in their browser) that lets them push updates to the
// same link; only its hash is stored.

export const SharedTripSchema = z.object({ request: TripRequestSchema, plan: PlanSchema });
export type SharedTrip = z.infer<typeof SharedTripSchema>;

type Stored = SharedTrip & { tokenHash: string; updatedAt: string };

const TTL_SECONDS = 180 * 24 * 60 * 60;
const ID_RE = /^[A-Za-z0-9]{10}$/;
const key = (id: string) => `wander:share:${id}`;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function newId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

export class ShareError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function redisOrThrow() {
  const redis = getRedis();
  if (!redis) throw new ShareError(503, "Sharing isn't set up on this server yet.");
  return redis;
}

export async function saveShare(trip: SharedTrip, existing?: { id: string; editToken: string }) {
  const redis = redisOrThrow();
  if (existing) {
    const current = ID_RE.test(existing.id) ? await redis.get<Stored>(key(existing.id)) : null;
    const given = Buffer.from(hash(existing.editToken));
    // A missing or expired share, or a wrong token, just gets a fresh link.
    if (current && timingSafeEqual(given, Buffer.from(current.tokenHash))) {
      await redis.set(key(existing.id), { ...trip, tokenHash: current.tokenHash, updatedAt: new Date().toISOString() }, { ex: TTL_SECONDS });
      return existing;
    }
  }
  const id = newId();
  const editToken = randomBytes(24).toString("base64url");
  await redis.set(key(id), { ...trip, tokenHash: hash(editToken), updatedAt: new Date().toISOString() }, { ex: TTL_SECONDS });
  return { id, editToken };
}

export async function loadShare(id: string): Promise<(SharedTrip & { updatedAt: string }) | null> {
  if (!ID_RE.test(id)) return null;
  const redis = getRedis();
  if (!redis) return null;
  const stored = await redis.get<Stored>(key(id));
  if (!stored) return null;
  const parsed = SharedTripSchema.safeParse(stored);
  return parsed.success ? { ...parsed.data, updatedAt: stored.updatedAt } : null;
}
