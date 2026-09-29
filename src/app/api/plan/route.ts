import { verifyStops } from "@/lib/geocode";
import { guard } from "@/lib/guard";
import { ndjsonResponse } from "@/lib/ndjson";
import { generateDay, generateEssentials, generateOutline, PlannerError } from "@/lib/planner";
import { DaySchema, EssentialsSchema, OutlineSchema, TripRequestSchema, type DayBrief, type Outline, type TripRequest } from "@/lib/types";

export const maxDuration = 300;

// Days are planned in parallel; cap it so long trips don't hit rate limits.
const DAY_CONCURRENCY = 7;

async function planDay(req: TripRequest, outline: Outline, brief: DayBrief, onText: (t: string) => void) {
  // One retry: a single flaky day shouldn't sink the whole trip.
  for (let attempt = 0; ; attempt++) {
    try {
      const day = DaySchema.safeParse(await generateDay(req, outline, brief, onText));
      if (!day.success) throw new PlannerError(`Day ${brief.dayNumber} came back malformed. Please try again.`);
      return day.data;
    } catch (err) {
      if (attempt >= 1) throw err;
    }
  }
}

export async function POST(req: Request) {
  const parsed = TripRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid trip details." }, { status: 400 });
  }
  const blocked = guard(req, "plan");
  if (blocked) return blocked;
  const trip = parsed.data;

  return ndjsonResponse(async ({ send, progress }) => {
    const outlineResult = OutlineSchema.safeParse(await generateOutline(trip));
    if (!outlineResult.success) throw new PlannerError("The planner returned a malformed plan. Please try again.");
    const outline = outlineResult.data;
    send({ type: "outline", outline });

    const city = `${outline.destination.name}, ${outline.destination.country}`;
    let next = 0;
    async function worker() {
      while (next < outline.days.length) {
        const i = next++;
        const day = await planDay(trip, outline, outline.days[i], progress(i));
        send({ type: "day", dayIndex: i, day: { ...day, stops: await verifyStops(day.stops, city) } });
      }
    }
    // Essentials are nice-to-have: a failure there shouldn't sink the trip.
    const essentials = generateEssentials(trip, outline)
      .then((e) => send({ type: "essentials", essentials: EssentialsSchema.parse(e) }))
      .catch((err) => console.error("[planner] essentials failed", err));
    await Promise.all([
      essentials,
      ...Array.from({ length: Math.min(DAY_CONCURRENCY, outline.days.length) }, worker),
    ]);
    send({ type: "done" });
  });
}
