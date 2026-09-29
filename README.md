# wander.

Your whole trip, planned like a local. Tell Wander where you're going, for how long and what you love. It builds a day-by-day plan that includes hidden gems, realistic timing and routing, plus the logistics people forget, with links to book everything.

## Run it

```bash
cp .env.example .env.local   # then fill in the keys
npm install
npm run dev                  # http://localhost:3000
```

| Variable | What it's for |
|---|---|
| `ANTHROPIC_API_KEY` | Trip planning (Claude Opus 5.5). Used on the server only. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | The map, and checking that every place exists and has the right coordinates. |
| `WANDER_EFFORT` | `low` (default) / `medium` / `high`: planning depth for each day. Higher is more careful but slower. |
| `WANDER_INVITE_CODE` | If set, visitors need this code to plan (or a link like `/?invite=CODE`). Set it on every public deployment. |
| `WANDER_DAILY_PLANS` / `_REPLANS` / `_TIKTOK` | Per-visitor daily limits (default 5 / 20 / 40). Approximate on Vercel because counters are in memory. |
| `NEXT_PUBLIC_GYG_PARTNER_ID`, `NEXT_PUBLIC_BOOKING_AID` | Affiliate IDs. They're added to booking links so you earn commission. |

## How it works

- **`/api/plan`** plans in parallel. A quick low-effort call sketches the trip: each day's area, theme and anchor places, plus where to stay and the budget. The browser shows the trip straight away. Then every day, and the "Know before you go" tips, are generated **at the same time**, and each day streams in as soon as it's done. A typical trip takes about 1 minute whatever its length. Every stop is checked against Mapbox Search and moved to the real place's coordinates; stops that can't be matched are shown as "≈ location". Timings are logged as `[planner] …` in the server output.
- **`/api/tiktok`** imports places from a TikTok link. TikTok's public oEmbed endpoint gives the caption (free, no key, no scraping). Claude Haiku 4.5 pulls out every place the caption names, and Mapbox pins them. Places that aren't on Mapbox are pinned to their neighbourhood when it's known, and anything else can be retyped. You can add places straight into a day, where they go wherever they add the least travel, or save them for later.
- **`/api/replan-day`** regenerates a single day from an instruction ("it's raining", "cheaper", or free text) and avoids places used on other days.
- **Reordering or removing** stops happens in the browser: start times are recalculated and travel between newly adjacent stops is estimated.
- Trips are saved in `localStorage` for now (see the roadmap).

```
src/lib/planner.ts        prompts + Claude calls
src/lib/planJsonSchema.ts output schema (mirrors zod schemas in types.ts)
src/lib/geocode.ts        Mapbox verification
src/lib/tiktok.ts         TikTok import (oEmbed → Haiku → Mapbox)
src/lib/links.ts          booking / ride / directions deep links (affiliate hooks)
src/components/           PlannerForm, Generating, TripView, StopCard, TripMap
```

## Roadmap

- **Next:** a mobile "Share → Wander" button. With accounts, every imported TikTok place also goes into a shared hidden-gems database.
- **Phase 3:** accounts and a database (e.g. Supabase) so trips sync and can be shared; group voting; live re-planning based on location and weather; partner APIs (GetYourGuide, Booking.com, Duffel, Welcome Pickups) for bookings inside the app.
