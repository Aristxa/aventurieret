import { z } from "zod";
import { verifyStops } from "@/lib/geocode";
import { guard } from "@/lib/guard";
import { ndjsonResponse } from "@/lib/ndjson";
import { PlannerError, regenerateDay } from "@/lib/planner";
import { DaySchema, PlanSchema, TripRequestSchema } from "@/lib/types";

export const maxDuration = 300;

const BodySchema = z.object({
  request: TripRequestSchema,
  plan: PlanSchema,
  dayIndex: z.number().int().min(0),
  instruction: z.string().trim().min(2).max(300),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.dayIndex >= parsed.data.plan.days.length) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const blocked = guard(req, "replan");
  if (blocked) return blocked;
  const { request, plan, dayIndex, instruction } = parsed.data;

  return ndjsonResponse(async ({ send, progress }) => {
    const raw = await regenerateDay(request, plan, dayIndex, instruction, progress());
    const day = DaySchema.safeParse(raw);
    if (!day.success) throw new PlannerError("The planner returned a malformed day. Please try again.");
    const city = `${plan.destination.name}, ${plan.destination.country}`;
    send({ type: "day", dayIndex, day: { ...day.data, stops: await verifyStops(day.data.stops, city) } });
  });
}
