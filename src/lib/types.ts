import { z } from "zod";

export const INTERESTS = [
  "Food & markets",
  "Hidden gems",
  "History",
  "Art & museums",
  "Nature & hikes",
  "Beaches",
  "Nightlife",
  "Coffee & cafés",
  "Shopping",
  "Photography spots",
  "Adventure",
  "Wellness & spa",
  "Architecture",
  "Local culture",
] as const;

export const TripRequestSchema = z.object({
  destination: z.string().trim().min(2).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(14),
  travelers: z.enum(["solo", "couple", "friends", "family"]),
  kidsAges: z.string().max(60).default(""),
  pace: z.enum(["chill", "balanced", "packed"]),
  budget: z.enum(["budget", "mid", "luxury"]),
  interests: z.array(z.string().max(40)).max(14),
  mustDo: z.string().max(500).default(""),
  avoid: z.string().max(500).default(""),
  arrival: z.string().max(200).default(""),
  mobility: z.string().max(200).default(""),
  dietary: z.string().max(200).default(""),
});
export type TripRequest = z.infer<typeof TripRequestSchema>;

export const CATEGORIES = [
  "sight",
  "food",
  "cafe",
  "nightlife",
  "nature",
  "museum",
  "shopping",
  "experience",
  "rest",
  "viewpoint",
] as const;

export const StopSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(CATEGORIES),
  startTime: z.string(),
  durationMin: z.number(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  description: z.string(),
  whyYou: z.string(),
  insiderTip: z.string(),
  costEstimate: z.string(),
  bookingType: z.enum(["none", "activity", "restaurant", "tickets"]),
  bookAhead: z.boolean(),
  isHiddenGem: z.boolean(),
  travelToNext: z.object({
    mode: z.enum(["walk", "transit", "taxi", "none"]),
    minutes: z.number(),
    note: z.string(),
  }),
  // Set server-side after Mapbox verification.
  verified: z.boolean().optional(),
  // Set when the stop was imported from a TikTok video.
  tiktokUrl: z.string().optional(),
});
export type Stop = z.infer<typeof StopSchema>;

export const DaySchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
  theme: z.string(),
  area: z.string(),
  energy: z.enum(["light", "moderate", "intense"]),
  rainPlan: z.string(),
  stops: z.array(StopSchema),
});
export type Day = z.infer<typeof DaySchema>;

export const PlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  destination: z.object({
    name: z.string(),
    country: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  whereToStay: z.object({
    area: z.string(),
    why: z.string(),
    alternatives: z.array(z.string()),
  }),
  budget: z.object({
    currency: z.string(),
    perPersonPerDay: z.string(),
    notes: z.string(),
  }),
  essentials: z.object({
    arrival: z.string(),
    gettingAround: z.string(),
    money: z.string(),
    connectivity: z.string(),
    power: z.string(),
    safety: z.string(),
    etiquette: z.string(),
    weather: z.string(),
    packing: z.array(z.string()),
    heads_up: z.array(z.string()),
    phrases: z.array(z.object({ phrase: z.string(), meaning: z.string() })),
  }),
  days: z.array(DaySchema),
});
export type Plan = z.infer<typeof PlanSchema>;

// Phase 1 of planning: everything except the stops, plus a brief per day that
// lets every day be planned in parallel without overlapping.
export const DayBriefSchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
  theme: z.string(),
  area: z.string(),
  energy: z.enum(["light", "moderate", "intense"]),
  brief: z.string(),
  anchors: z.array(z.string()),
});
export type DayBrief = z.infer<typeof DayBriefSchema>;
export const OutlineSchema = PlanSchema.omit({ days: true, essentials: true }).extend({ days: z.array(DayBriefSchema) });
export const EssentialsSchema = PlanSchema.shape.essentials;
export type Essentials = Plan["essentials"];
export type Outline = z.infer<typeof OutlineSchema>;

export type SavedSpot = {
  id: string;
  name: string;
  category: Stop["category"];
  lat: number;
  lng: number;
  address: string;
  verified: boolean;
  caption: string;
  author: string;
  thumbnail: string;
  videoUrl: string;
};

export type Trip = {
  id: string;
  createdAt: string;
  request: TripRequest;
  plan: Plan;
  saved?: SavedSpot[];
};

// Events streamed from /api/plan and /api/replan-day as NDJSON.
export type StreamEvent =
  | { type: "progress"; places: string[]; days: number; dayIndex?: number }
  | { type: "status"; message: string }
  | { type: "outline"; outline: Outline }
  | { type: "essentials"; essentials: Essentials }
  | { type: "day"; day: Day; dayIndex?: number }
  | { type: "done" }
  | { type: "error"; message: string };
