// JSON Schemas for Claude structured outputs. Kept in sync with the zod
// schemas in types.ts (zod validates the result; these constrain generation).
import { CATEGORIES } from "./types";

type Schema = Record<string, unknown>;

const str = (description?: string): Schema =>
  description ? { type: "string", description } : { type: "string" };
const num = (description?: string): Schema =>
  description ? { type: "number", description } : { type: "number" };
const int = (description?: string): Schema =>
  description ? { type: "integer", description } : { type: "integer" };
const bool = (description?: string): Schema =>
  description ? { type: "boolean", description } : { type: "boolean" };
const oneOf = (values: readonly string[], description?: string): Schema => ({
  type: "string",
  enum: [...values],
  ...(description ? { description } : {}),
});
const arr = (items: Schema): Schema => ({ type: "array", items });
const obj = (properties: Record<string, Schema>): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const stop = obj({
  id: str("Short unique slug, e.g. d1-s3"),
  name: str("Exact real name as it appears on maps"),
  category: oneOf(CATEGORIES),
  startTime: str("24h local time HH:MM"),
  durationMin: int(),
  lat: num(),
  lng: num(),
  address: str("Street address or neighbourhood, empty string if unknown"),
  description: str("1-2 vivid sentences"),
  whyYou: str("Why this fits THIS traveller's interests, one sentence"),
  insiderTip: str("Concrete local tip: best time, what to order, which entrance, etc."),
  costEstimate: str("e.g. 'Free', '€12 pp', '€€'"),
  bookingType: oneOf(["none", "activity", "restaurant", "tickets"]),
  bookAhead: bool("True if it sells out / needs reservation in advance"),
  isHiddenGem: bool("True for lesser-known local favourites, not top-10 tourist sights"),
  travelToNext: obj({
    mode: oneOf(["walk", "transit", "taxi", "none"], "'none' for the last stop of the day"),
    minutes: int(),
    note: str("e.g. 'Metro line 2, 4 stops' or ''"),
  }),
});

export const daySchema = obj({
  dayNumber: int(),
  date: str("YYYY-MM-DD"),
  theme: str("Short evocative day title"),
  area: str("Main neighbourhood(s) covered"),
  energy: oneOf(["light", "moderate", "intense"]),
  rainPlan: str("Concrete swap if it rains"),
  stops: arr(stop),
});

const dayBrief = obj({
  dayNumber: int(),
  date: str("YYYY-MM-DD"),
  theme: str("Short evocative day title"),
  area: str("Main neighbourhood(s) covered"),
  energy: oneOf(["light", "moderate", "intense"]),
  brief: str("What this day covers and how it should flow, including timing constraints (arrival, departure, closures on this weekday)"),
  anchors: arr(str("A key place this day must include; each place belongs to exactly one day")),
});

const planFields = {
  title: str(),
  summary: str("2-3 sentences, the vibe of this trip"),
  destination: obj({ name: str(), country: str(), lat: num(), lng: num() }),
  whereToStay: obj({
    area: str("Best neighbourhood to base yourself for this itinerary"),
    why: str(),
    alternatives: arr(str()),
  }),
  budget: obj({
    currency: str("ISO code, e.g. EUR"),
    perPersonPerDay: str("Range excluding accommodation, e.g. '€60-90'"),
    notes: str(),
  }),
};

export const essentialsSchema = obj({
  essentials: obj({
    arrival: str("Exactly how to get from the main airport/station to the recommended area, with price and time"),
    gettingAround: str("Transit cards, apps, taxi apps that work there, walking"),
    money: str("Cash vs card, tipping norms, ATM tips"),
    connectivity: str("eSIM/SIM options, wifi"),
    power: str("Plug type and voltage"),
    safety: str("Specific scams or areas to watch, emergency number"),
    etiquette: str("Local customs visitors get wrong"),
    weather: str("What to expect for these exact dates"),
    packing: arr(str()),
    heads_up: arr(str("Date-specific warnings: closures on these weekdays, holidays, festivals, strikes season")),
    phrases: arr(obj({ phrase: str(), meaning: str() })),
  }),
});

export const outlineSchema = obj({ ...planFields, days: arr(dayBrief) });
