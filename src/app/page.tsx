"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Generating } from "@/components/Generating";
import { InviteGate } from "@/components/InviteGate";
import { PlannerForm } from "@/components/PlannerForm";
import { TripView } from "@/components/TripView";
import {
  deleteTrip,
  formatDate,
  getServerTrips,
  getTrips,
  INVITE_EVENT,
  saveInvite,
  saveTrip,
  streamRequest,
  subscribeTrips,
} from "@/lib/client";
import type { Day, DayBrief, Essentials, Trip, TripRequest } from "@/lib/types";

type View =
  | { kind: "home" }
  | { kind: "generating"; request: TripRequest }
  | { kind: "trip"; tripId: string };

// A trip whose days are still streaming in. `pending` maps day index to the
// place names picked so far for days that aren't finished.
type Build = { trip: Trip; pending: Record<number, string[]>; error: string | null };

const NO_ESSENTIALS: Essentials = {
  arrival: "",
  gettingAround: "",
  money: "",
  connectivity: "",
  power: "",
  safety: "",
  etiquette: "",
  weather: "",
  packing: [],
  heads_up: [],
  phrases: [],
};

const placeholderDay = (b: DayBrief): Day => ({
  dayNumber: b.dayNumber,
  date: b.date,
  theme: b.theme,
  area: b.area,
  energy: b.energy,
  rainPlan: "",
  stops: [],
});

export default function Home() {
  const [view, setView] = useState<View>({ kind: "home" });
  const trips = useSyncExternalStore(subscribeTrips, getTrips, getServerTrips);
  const [error, setError] = useState<string | null>(null);
  // Trips planned this session, keyed by id. Days stream into these.
  const [builds, setBuilds] = useState<Record<string, Build>>({});
  const saved = useRef(new Map<string, Trip>());
  const [inviteOpen, setInviteOpen] = useState(false);
  // The last trip request, retried after the visitor enters an invite code.
  const lastRequest = useRef<TripRequest | null>(null);

  useEffect(() => {
    // Share links can carry the code: /?invite=CODE
    const url = new URL(window.location.href);
    const code = url.searchParams.get("invite");
    if (code) {
      saveInvite(code);
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url);
    }
    const open = () => setInviteOpen(true);
    window.addEventListener(INVITE_EVENT, open);
    return () => window.removeEventListener(INVITE_EVENT, open);
  }, []);

  // Persist builds whenever their trip changes (progress-only updates skip this).
  useEffect(() => {
    for (const b of Object.values(builds)) {
      if (saved.current.get(b.trip.id) !== b.trip) {
        saved.current.set(b.trip.id, b.trip);
        saveTrip(b.trip);
      }
    }
  }, [builds]);

  const patch = (id: string, fn: (b: Build) => Build) =>
    setBuilds((prev) => (prev[id] ? { ...prev, [id]: fn(prev[id]) } : prev));

  const plan = async (request: TripRequest) => {
    lastRequest.current = request;
    setError(null);
    setView({ kind: "generating", request });
    window.scrollTo({ top: 0 });
    let tripId: string | null = null;
    let finished = false;

    const fail = (message: string) => {
      finished = true;
      if (!tripId) {
        setError(message);
        setView({ kind: "home" });
        return;
      }
      // Keep the finished days; unfinished ones can be planned one by one.
      patch(tripId, (b) => ({
        ...b,
        pending: {},
        error: `${message} Days that didn't finish can be planned individually.`,
      }));
    };

    try {
      await streamRequest("/api/plan", request, (e) => {
        if (e.type === "outline") {
          const { days, ...rest } = e.outline;
          const trip: Trip = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            request,
            plan: { ...rest, essentials: NO_ESSENTIALS, days: days.map(placeholderDay) },
          };
          const id = trip.id;
          tripId = id;
          setBuilds((prev) => ({
            ...prev,
            [id]: { trip, error: null, pending: Object.fromEntries(days.map((_, i) => [i, []])) },
          }));
          setView({ kind: "trip", tripId: id });
        } else if (!tripId) {
          if (e.type === "error") fail(e.message);
        } else if (e.type === "progress" && e.dayIndex !== undefined) {
          const i = e.dayIndex;
          patch(tripId, (b) => (b.pending[i] ? { ...b, pending: { ...b.pending, [i]: e.places } } : b));
        } else if (e.type === "day" && e.dayIndex !== undefined) {
          const i = e.dayIndex;
          patch(tripId, (b) => ({
            ...b,
            pending: Object.fromEntries(Object.entries(b.pending).filter(([k]) => Number(k) !== i)),
            trip: { ...b.trip, plan: { ...b.trip.plan, days: b.trip.plan.days.map((d, j) => (j === i ? e.day : d)) } },
          }));
        } else if (e.type === "essentials") {
          patch(tripId, (b) => ({ ...b, trip: { ...b.trip, plan: { ...b.trip.plan, essentials: e.essentials } } }));
        } else if (e.type === "done") {
          finished = true;
          patch(tripId, (b) => ({ ...b, pending: {} }));
        } else if (e.type === "error") fail(e.message);
      });
    } catch {
      fail("Lost connection to the planner.");
    }
    if (!finished) fail("The planner stopped unexpectedly.");
  };

  const updateTrip = (edited: Trip) => {
    if (!builds[edited.id]) {
      saveTrip(edited);
      return;
    }
    // Don't let an edit overwrite days that are still streaming in.
    patch(edited.id, (b) => ({
      ...b,
      trip: {
        ...edited,
        plan: { ...edited.plan, days: edited.plan.days.map((d, i) => (b.pending[i] ? b.trip.plan.days[i] : d)) },
      },
    }));
  };

  const invite = inviteOpen && (
    <InviteGate
      onClose={() => setInviteOpen(false)}
      onDone={() => {
        setInviteOpen(false);
        setError(null);
        if (view.kind === "home" && lastRequest.current) plan(lastRequest.current);
      }}
    />
  );

  if (view.kind === "generating") return <Generating destination={view.request.destination} />;

  if (view.kind === "trip") {
    const build = builds[view.tripId];
    const trip = build?.trip ?? trips.find((t) => t.id === view.tripId);
    if (trip) {
      return (
        <>
        {invite}
        <TripView
          trip={trip}
          pending={build?.pending ?? {}}
          notice={build?.error ?? null}
          onBack={() => setView({ kind: "home" })}
          onChange={updateTrip}
        />
        </>
      );
    }
  }

  return (
    <main className="relative flex-1 overflow-hidden">
      {invite}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-coral/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-80 h-[28rem] w-[28rem] rounded-full bg-teal/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
        <div className="lg:pt-8">
          <div className="font-display text-2xl font-semibold">
            Aventurieret<span className="text-coral">.</span>
          </div>
          <h1 className="mt-10 font-display text-5xl leading-[1.05] sm:text-6xl">
            Your whole trip,
            <br />
            <em className="text-coral">planned like a local.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">
            Tell us how long you&apos;re staying and what you love. Aventurieret builds a day-by-day plan with hidden gems,
            realistic timing, and everything you&apos;d otherwise forget: airport transfers, closures, tipping, what to pack.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              ["💎", "Hidden gems, not just the top-10 list"],
              ["🗺️", "Every stop on a map, routed so you don't zig-zag"],
              ["✨", "Rain? Tired? Re-plan any day in one tap"],
              ["🎟️", "Book tickets, tables, stays and rides from the plan"],
            ].map(([i, t]) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper shadow-sm">{i}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {error && (
            <div className="animate-rise mb-4 rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3 text-sm text-coral">{error}</div>
          )}
          <PlannerForm onSubmit={plan} />

          {trips.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Your trips</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {trips.map((t) => (
                  <div key={t.id} className="group relative rounded-2xl border border-line bg-paper p-4 transition hover:border-ink/30">
                    <button onClick={() => setView({ kind: "trip", tripId: t.id })} className="block w-full text-left">
                      <div className="font-display text-lg leading-tight">{t.plan.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {t.plan.destination.name} · {formatDate(t.request.startDate)} · {t.plan.days.length} days
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        deleteTrip(t.id);
                      }}
                      aria-label="Delete trip"
                      className="absolute right-3 top-3 text-xs text-muted opacity-0 hover:text-coral group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
