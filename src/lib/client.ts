"use client";

import type { Day, SavedSpot, Stop, StreamEvent, Trip } from "./types";

const STORAGE_KEY = "wander.trips.v1";

// Saved trips live in localStorage, exposed as an external store for
// useSyncExternalStore. The snapshot is cached by raw string so React sees a
// stable reference until the data actually changes.
const listeners = new Set<() => void>();
let cache: { raw: string | null; trips: Trip[] } = { raw: null, trips: [] };
const EMPTY: Trip[] = [];

function readRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getTrips(): Trip[] {
  const raw = readRaw();
  if (raw !== cache.raw) {
    let trips: Trip[] = [];
    try {
      trips = raw ? (JSON.parse(raw) as Trip[]) : [];
    } catch {}
    cache = { raw, trips };
  }
  return cache.trips;
}
export const getServerTrips = () => EMPTY;

export function subscribeTrips(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function writeTrips(trips: Trip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips.slice(0, 20)));
  } catch {
    // Storage full or blocked: the trip still works for this session.
  }
  listeners.forEach((l) => l());
}

export function saveTrip(trip: Trip) {
  writeTrips([trip, ...getTrips().filter((t) => t.id !== trip.id)]);
}

export function deleteTrip(id: string) {
  writeTrips(getTrips().filter((t) => t.id !== id));
}

// Invite code for protected deployments, kept in this browser.
const INVITE_KEY = "wander.invite";
export const INVITE_EVENT = "wander:invite-required";

export function getInvite() {
  try {
    return localStorage.getItem(INVITE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveInvite(code: string) {
  try {
    localStorage.setItem(INVITE_KEY, code.trim());
  } catch {}
}

/** POSTs JSON to one of our API routes with the invite code attached. */
export async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-wander-code": getInvite() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) window.dispatchEvent(new Event(INVITE_EVENT));
  return res;
}

/** POSTs JSON and calls onEvent for each NDJSON line the server streams back. */
export async function streamRequest(url: string, body: unknown, onEvent: (e: StreamEvent) => void) {
  const res = await apiPost(url, body);
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    onEvent({ type: "error", message: err.message ?? err.error ?? `Request failed (${res.status})` });
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as StreamEvent);
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent);
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toTime = (min: number) => {
  const m = ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * After the user reorders or removes stops, re-estimate legs between stops that
 * are no longer neighbours and re-flow start times from the first stop.
 */
export function reflowDay(day: Day, stops: Stop[]): Day {
  const prevNext = new Map(day.stops.map((s, i) => [s.id, day.stops[i + 1]?.id]));
  // The day keeps its original start time whichever stop is now first.
  let clock = day.stops[0] ? toMin(day.stops[0].startTime) : 0;
  const out = stops.map((s, i) => {
    const next = stops[i + 1];
    let travelToNext = s.travelToNext;
    if (!next) travelToNext = { mode: "none", minutes: 0, note: "" };
    else if (prevNext.get(s.id) !== next.id) {
      const d = km(s, next);
      travelToNext =
        d < 1.5
          ? { mode: "walk", minutes: Math.max(3, Math.round(d * 13)), note: "estimated" }
          : { mode: d > 8 ? "taxi" : "transit", minutes: Math.round(d * 4 + 8), note: "estimated" };
    }
    const stop = { ...s, startTime: toTime(clock), travelToNext };
    clock += s.durationMin + travelToNext.minutes;
    return stop;
  });
  return { ...day, stops: out };
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, opts);
}

const DEFAULT_MINUTES: Record<Stop["category"], number> = {
  food: 75,
  cafe: 45,
  nightlife: 90,
  museum: 90,
  sight: 60,
  viewpoint: 30,
  shopping: 45,
  nature: 90,
  experience: 90,
  rest: 45,
};

export function spotToStop(spot: SavedSpot): Stop {
  return {
    id: spot.id,
    name: spot.name,
    category: spot.category,
    startTime: "00:00",
    durationMin: DEFAULT_MINUTES[spot.category],
    lat: spot.lat,
    lng: spot.lng,
    address: spot.address,
    description: spot.caption.replace(/#\S+/g, "").trim().slice(0, 180),
    whyYou: `You saved this from ${spot.author ? `@${spot.author}'s` : "a"} TikTok.`,
    insiderTip: "",
    costEstimate: "",
    bookingType: "none",
    bookAhead: false,
    isHiddenGem: true,
    travelToNext: { mode: "none", minutes: 0, note: "" },
    verified: spot.verified,
    tiktokUrl: spot.videoUrl,
  };
}

/** Inserts a saved spot where it adds the least travel, then re-flows the day's times. */
export function addSpotToDay(day: Day, spot: SavedSpot): Day {
  const stop = spotToStop(spot);
  const s = day.stops;
  let best = s.length;
  let bestCost = Infinity;
  for (let i = 0; i <= s.length; i++) {
    const prev = s[i - 1];
    const next = s[i];
    const cost =
      (prev ? km(prev, stop) : 0) + (next ? km(stop, next) : 0) - (prev && next ? km(prev, next) : 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  }
  const stops = [...s.slice(0, best), stop, ...s.slice(best)];
  // An empty day has no start time to keep; begin at 10:00.
  const base = s.length ? day : { ...day, stops: [{ ...stop, startTime: "10:00" }] };
  return reflowDay(base, stops);
}

/** The day whose stops are closest to the spot. */
export function nearestDayIndex(days: Day[], spot: { lat: number; lng: number }) {
  let best = 0;
  let bestKm = Infinity;
  days.forEach((d, i) =>
    d.stops.forEach((s) => {
      const k = km(s, spot);
      if (k < bestKm) {
        bestKm = k;
        best = i;
      }
    }),
  );
  return best;
}
