import { z } from "zod";
import { guard } from "@/lib/guard";
import { getRedis } from "@/lib/redis";
import { saveShare, ShareError, SharedTripSchema } from "@/lib/share";

const MAX_BYTES = 500_000;

const BodySchema = z.object({
  trip: SharedTripSchema,
  existing: z.object({ id: z.string().max(20), editToken: z.string().max(100) }).optional(),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return Response.json({ message: "This trip is too large to share." }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ message: "Invalid trip." }, { status: 400 });

  const blocked = await guard(req, "share");
  if (blocked) return blocked;

  try {
    return Response.json(await saveShare(parsed.data.trip, parsed.data.existing));
  } catch (err) {
    if (err instanceof ShareError) return Response.json({ message: err.message }, { status: err.status });
    console.error("[share]", err);
    return Response.json({ message: "Couldn't create the link. Try again." }, { status: 500 });
  }
}

/** Lets the UI hide the Share button until storage is configured. */
export function GET() {
  return Response.json({ enabled: getRedis() !== null });
}
