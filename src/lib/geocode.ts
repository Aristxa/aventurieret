import type { Plan, Stop } from "./types";

// Verifies Claude's places against Mapbox Search Box and snaps coordinates to
// the real POI. Claude's own coordinates are usually close but not exact;
// unmatched stops keep them and are flagged verified=false in the UI.

const SEARCH_URL = "https://api.mapbox.com/search/searchbox/v1/forward";
const MAX_SNAP_KM = 4;
const CONCURRENCY = 8;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !["the", "and", "cafe", "restaurant", "bar"].includes(t)),
  );
}

function namesMatch(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

type Place = { name: string; lat: number; lng: number; address: string };

/** Looks up a place by name near a point. Returns null on no match or error. */
export async function searchPlace(query: string, near: { lat: number; lng: number }): Promise<Place | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const params = new URLSearchParams({ q: query, access_token: token, proximity: `${near.lng},${near.lat}`, limit: "1" });
  try {
    const res = await fetch(`${SEARCH_URL}?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { geometry: { coordinates: [number, number] }; properties: { name?: string; full_address?: string } }[];
    };
    const hit = data.features?.[0];
    if (!hit) return null;
    const [lng, lat] = hit.geometry.coordinates;
    return { name: hit.properties.name ?? "", lat, lng, address: hit.properties.full_address ?? "" };
  } catch {
    return null;
  }
}

/** A search hit counts as the same place if it's nearby and the names share a word. */
export function isSamePlace(name: string, near: { lat: number; lng: number }, hit: Place, maxKm = MAX_SNAP_KM) {
  return distanceKm(near, hit) <= maxKm && namesMatch(name, hit.name);
}

async function verifyStop(stop: Stop, city: string): Promise<Stop> {
  // "Rest" stops (hotel break, a bench) aren't specific places to look up.
  if (stop.category === "rest") return stop;
  const hit = await searchPlace(`${stop.name}, ${city}`, stop);
  if (!hit || !isSamePlace(stop.name, stop, hit)) return { ...stop, verified: false };
  return { ...stop, lat: hit.lat, lng: hit.lng, address: stop.address || hit.address, verified: true };
}

export async function verifyStops(stops: Stop[], city: string): Promise<Stop[]> {
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return stops;
  const out: Stop[] = new Array(stops.length);
  let next = 0;
  async function worker() {
    while (next < stops.length) {
      const i = next++;
      out[i] = await verifyStop(stops[i], city);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, stops.length) }, worker));
  return out;
}

export async function verifyPlan(plan: Plan): Promise<Plan> {
  const city = `${plan.destination.name}, ${plan.destination.country}`;
  const flat = plan.days.flatMap((d) => d.stops);
  const verified = await verifyStops(flat, city);
  let i = 0;
  return {
    ...plan,
    days: plan.days.map((d) => ({ ...d, stops: d.stops.map(() => verified[i++]) })),
  };
}
