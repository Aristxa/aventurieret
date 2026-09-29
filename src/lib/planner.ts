import Anthropic from "@anthropic-ai/sdk";
import { daySchema, essentialsSchema, outlineSchema } from "./planJsonSchema";
import type { Day, DayBrief, Essentials, Outline, Plan, TripRequest } from "./types";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());
const MODEL = "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORT = (process.env.WANDER_EFFORT as Effort | undefined) ?? "low";

const SYSTEM = `You are Wander, a meticulous local-expert travel planner. You build itineraries a well-connected local friend would build - not a generic top-10 list.

Principles:
- Only real, currently operating places with accurate names and coordinates. Never invent a place. If unsure a small spot still exists, choose a well-established one.
- Respect opening days/hours for the actual weekday of each date (many museums close Mondays, markets run on specific days, restaurants close between lunch and dinner in many countries). Mention closures in essentials.heads_up.
- Cluster each day geographically to minimise backtracking; order stops along a sensible route and give realistic travel times between them.
- Eat on local schedules (e.g. late dinners in Spain) and pick food spots locals actually go to. Respect dietary needs.
- Pace: chill = 3-4 stops/day with real downtime; balanced = 4-6; packed = 6-8. Include "rest" stops (hotel break, park bench, spa) when the pace or group needs them. Arrival day is lighter and starts after realistic arrival; account for jet lag.
- Families: kid-friendly timing, shorter walks, playgrounds/snacks; mobility constraints: avoid stairs-heavy or steep routes.
- About a third of stops should be hidden gems - places locals and in-the-know travellers love (the kind of spots that go viral on TikTok from local creators), not tourist traps. Mark them isHiddenGem.
- Put the big-name sights at the smartest time (opening time or late afternoon) and say so in insiderTip.
- Every insiderTip must be specific and useful (what to order, which entrance, when crowds thin, what to skip), never generic filler.
- Currency and prices in the local currency with realistic current estimates for the budget level.
- Write concisely and vividly. Use plain text, no markdown.`;

function describeRequest(r: TripRequest) {
  const who =
    r.travelers === "family" ? `family${r.kidsAges ? ` (kids aged ${r.kidsAges})` : ""}` : r.travelers;
  return [
    `Destination: ${r.destination}`,
    `Dates: ${r.days} day(s) starting ${r.startDate}`,
    `Travellers: ${who}`,
    `Pace: ${r.pace}`,
    `Budget: ${r.budget}`,
    `Interests: ${r.interests.length ? r.interests.join(", ") : "open to anything"}`,
    r.mustDo && `Must do: ${r.mustDo}`,
    r.avoid && `Avoid: ${r.avoid}`,
    r.arrival && `Arrival/departure: ${r.arrival}`,
    r.mobility && `Mobility: ${r.mobility}`,
    r.dietary && `Dietary: ${r.dietary}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export class PlannerError extends Error {}

/**
 * Streams a structured-output request, reporting accumulated JSON text so the
 * caller can show live progress, and returns the parsed JSON.
 */
async function streamJson(
  label: string,
  userPrompt: string,
  schema: Record<string, unknown>,
  onText: (accumulated: string) => void,
  effort: Effort = EFFORT,
): Promise<unknown> {
  const started = Date.now();
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      onText(text);
    }
  }

  const message = await stream.finalMessage();
  console.log(
    `[planner] ${label}: ${((Date.now() - started) / 1000).toFixed(1)}s, ${message.usage.output_tokens} output tokens (effort ${effort})`,
  );
  if (message.stop_reason === "refusal") {
    throw new PlannerError("The planner declined this request. Try rephrasing your trip details.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new PlannerError("That trip was too big to plan in one go. Try fewer days.");
  }
  const finalText = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(finalText);
  } catch {
    throw new PlannerError("The planner returned an incomplete plan. Please try again.");
  }
}

const STOP_NAME_RE = /"name"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"category"/g;

export function extractProgress(text: string) {
  const places = [...text.matchAll(STOP_NAME_RE)].map((m) => m[1].replace(/\\"/g, '"'));
  const days = (text.match(/"dayNumber"/g) ?? []).length;
  return { places, days };
}

export async function generateOutline(req: TripRequest) {
  const prompt = `Design the overall shape of this trip. Don't list every stop yet: for each of the ${req.days} days (dates starting ${req.startDate}) choose the area, theme, energy, a brief describing how the day flows, and the 2-4 anchor places it must include. Days will then be planned in detail independently, so give each day its own area and anchors with no overlap between days, and put arrival/departure constraints into the brief of the day they affect. Also choose where to stay and estimate the budget. Keep every field brief: this is a sketch that gets filled in next.

${describeRequest(req)}`;
  // Low effort: the outline is a short sketch and everything else waits on it.
  return (await streamJson("outline", prompt, outlineSchema, () => {}, "low")) as Outline;
}

export async function generateEssentials(req: TripRequest, outline: Outline) {
  const prompt = `Write the practical "know before you go" essentials for this trip. Be specific to this destination and these exact dates, not generic travel advice.

${describeRequest(req)}
Base: ${outline.whereToStay.area}
Days: ${outline.days.map((d) => `${d.date} ${d.area}`).join("; ")}`;
  const raw = (await streamJson("essentials", prompt, essentialsSchema, () => {}, "low")) as { essentials: Essentials };
  return raw.essentials;
}

export async function generateDay(
  req: TripRequest,
  outline: Outline,
  brief: DayBrief,
  onText: (t: string) => void,
) {
  const others = outline.days
    .filter((d) => d.dayNumber !== brief.dayNumber)
    .map((d) => `Day ${d.dayNumber} (${d.area}): ${d.anchors.join(", ")}`)
    .join("\n");
  const prompt = `Plan day ${brief.dayNumber} of this trip in full detail.

${describeRequest(req)}
Base: ${outline.whereToStay.area}

This day:
Date: ${brief.date}
Theme: ${brief.theme}
Area: ${brief.area}
Energy: ${brief.energy}
Brief: ${brief.brief}
Must include: ${brief.anchors.join(", ")}

Other days already cover these - don't use any of their places:
${others || "none"}

Keep dayNumber ${brief.dayNumber}, date ${brief.date}, and this theme and area. Use ids prefixed d${brief.dayNumber}-s.`;
  return (await streamJson(`day ${brief.dayNumber}`, prompt, daySchema, onText)) as Day;
}

export async function regenerateDay(
  req: TripRequest,
  plan: Plan,
  dayIndex: number,
  instruction: string,
  onText: (t: string) => void,
) {
  const day = plan.days[dayIndex];
  const otherStops = plan.days
    .filter((_, i) => i !== dayIndex)
    .flatMap((d) => d.stops.map((s) => s.name));
  const prompt = `Here is a trip being planned:\n${describeRequest(req)}\nBase: ${plan.whereToStay.area}\n\nRe-plan day ${day.dayNumber} (${day.date}). The current version is:\n${JSON.stringify(
    { theme: day.theme, area: day.area, stops: day.stops.map((s) => `${s.startTime} ${s.name}`) },
  )}\n\nThe traveller's request for the new version: "${instruction}"\n\nDon't repeat places already used on other days: ${otherStops.join("; ") || "none"}.\nKeep dayNumber ${day.dayNumber} and date ${day.date}. Use ids prefixed d${day.dayNumber}-r.`;
  return (await streamJson(`replan day ${day.dayNumber}`, prompt, daySchema, onText)) as Day;
}
