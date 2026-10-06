# Aventurieret

A trip planner. You say where you're going, for how long and what you like, and it builds a day-by-day plan with lesser-known places, realistic timing and routes, practical tips, and booking links.

## Running it

```bash
cp .env.example .env.local   # fill in the keys
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Used for |
|---|---|
| `ANTHROPIC_API_KEY` | Trip planning (Claude Opus 5.5), server side only |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | The map, and checking that each place exists and has the right coordinates |
| `WANDER_EFFORT` | `low` (default), `medium` or `high`: how much effort goes into each day. Higher is slower |
| `WANDER_INVITE_CODE` | If set, visitors need this code to plan (or a `/?invite=CODE` link). Set it on public deployments |
| `WANDER_DAILY_PLANS` / `_REPLANS` / `_TIKTOK` | Daily limits per visitor (default 5 / 20 / 40). Counters are in memory, so they're approximate on Vercel |
| `NEXT_PUBLIC_GYG_PARTNER_ID`, `NEXT_PUBLIC_BOOKING_AID` | Affiliate IDs added to booking links |

## How it works

`/api/plan` first makes one quick call that outlines the trip: the area, theme and main places for each day, where to stay, and the budget. The browser shows that outline right away. Then all the days and the "Know before you go" tips are generated in parallel, and each day appears as soon as it's ready, so most trips take about a minute regardless of length. Every stop is looked up in Mapbox Search and moved to the real coordinates; stops that can't be matched are marked "≈ location". Timings are logged as `[planner] …` on the server.

`/api/tiktok` imports places from a TikTok link. The caption comes from TikTok's public oEmbed endpoint (no key or scraping needed), Claude Haiku 4.5 extracts the places it mentions, and Mapbox pins them. If a place isn't on Mapbox it's pinned to its neighbourhood when that's known, otherwise it can be retyped. Imported places can go straight into a day (wherever they add the least travel) or be saved for later.

`/api/replan-day` redoes a single day from an instruction like "it's raining", "cheaper" or free text, without reusing places from other days.

Reordering or removing stops happens in the browser, which recalculates start times and estimates travel between the new neighbours. Trips are stored in `localStorage` for now.

```
src/lib/planner.ts        prompts and Claude calls
src/lib/planJsonSchema.ts output schema (mirrors the zod schemas in types.ts)
src/lib/geocode.ts        Mapbox verification
src/lib/tiktok.ts         TikTok import (oEmbed → Haiku → Mapbox)
src/lib/links.ts          booking, ride and directions links (affiliate hooks)
src/components/           PlannerForm, Generating, TripView, StopCard, TripMap
```

## Planned

- A "Share → Aventurieret" button on mobile. With accounts, imported TikTok places would also feed a shared database of lesser-known spots.
- Later: accounts and a database (e.g. Supabase) to sync and share trips, group voting, re-planning based on location and weather, and partner APIs (GetYourGuide, Booking.com, Duffel, Welcome Pickups) for booking inside the app.
