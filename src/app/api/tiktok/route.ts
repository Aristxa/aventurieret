import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { importTikTok } from "@/lib/tiktok";

const BodySchema = z.object({
  url: z.string().trim().min(10).max(500),
  destination: z.string().max(200),
  center: z.object({ lat: z.number(), lng: z.number() }),
  manualName: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "bad_link", message: "Paste a TikTok link first." });
  try {
    return Response.json(await importTikTok(parsed.data));
  } catch (err) {
    console.error("[tiktok]", err);
    const message =
      err instanceof Anthropic.RateLimitError
        ? "Too many imports right now. Try again in a moment."
        : "Something went wrong reading that TikTok. Try again.";
    return Response.json({ ok: false, reason: "unavailable", message });
  }
}
