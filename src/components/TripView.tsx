"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { addSpotToDay, apiPost, fetchShareEnabled, formatDate, reflowDay, streamRequest } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { staysLink } from "@/lib/links";
import type { Day, SavedSpot, Trip } from "@/lib/types";
import { LangToggle } from "./LangToggle";
import { StopCard } from "./StopCard";
import { TikTokImport } from "./TikTokImport";
import { Tour, TourButton, useTour } from "./Tour";
import { TripMap } from "./TripMap";

// Instructions for the planner; their button labels are in the dictionary (t.trip.tweaks).
const QUICK_TWEAKS = [
  "It's going to rain all day - make it mostly indoor and cosy.",
  "Make this day much more relaxed: fewer stops, more downtime.",
  "Make this day cheaper: free sights, street food, walkable.",
  "Swap the touristy spots for places locals love.",
  "Start later and push the day into a great evening and nightlife.",
];

export function TripView({
  trip,
  pending = {},
  notice = null,
  readOnly = false,
  onChange,
  onBack,
}: {
  trip: Trip;
  /** Days still being planned, with the place names picked so far. */
  pending?: Record<number, string[]>;
  notice?: string | null;
  /** Shared-link view: no editing, importing or sharing. */
  readOnly?: boolean;
  onChange: (t: Trip) => void;
  onBack: () => void;
}) {
  const { plan } = trip;
  const t = useT();
  const tr = t.trip;
  const tour = useTour("trip");
  const [tab, setTab] = useState<"days" | "essentials" | "stay">("days");
  const [dayIdx, setDayIdx] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replanning, setReplanning] = useState<{ places: string[] } | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [customTweak, setCustomTweak] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const saved = readOnly ? [] : (trip.saved ?? []);
  const [shareState, setShareState] = useState<
    | { status: "idle" }
    | { status: "working" }
    | { status: "done"; url: string; copied: boolean }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    if (!readOnly) fetchShareEnabled().then(setCanShare);
  }, [readOnly]);

  const day = plan.days[dayIdx];
  const dayPending = pending[dayIdx];
  const building = Object.keys(pending).length > 0;
  const city = `${plan.destination.name}, ${plan.destination.country}`;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateDay = useCallback(
    (d: Day, idx = dayIdx) => onChange({ ...trip, plan: { ...plan, days: plan.days.map((x, i) => (i === idx ? d : x)) } }),
    [trip, plan, dayIdx, onChange],
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = day.stops.findIndex((s) => s.id === e.active.id);
    const to = day.stops.findIndex((s) => s.id === e.over!.id);
    updateDay(reflowDay(day, arrayMove(day.stops, from, to)));
  };

  const addSpots = (spots: SavedSpot[], target: number | "saved") => {
    setImportOpen(false);
    if (target === "saved") {
      onChange({ ...trip, saved: [...saved, ...spots] });
      return;
    }
    const d = spots.reduce(addSpotToDay, plan.days[target]);
    onChange({ ...trip, plan: { ...plan, days: plan.days.map((x, i) => (i === target ? d : x)) } });
    setTab("days");
    setDayIdx(target);
    setActiveId(spots[0].id);
  };

  // Moves a saved spot into the day being viewed.
  const placeSaved = (spot: SavedSpot) => {
    const d = addSpotToDay(day, spot);
    onChange({
      ...trip,
      saved: saved.filter((s) => s.id !== spot.id),
      plan: { ...plan, days: plan.days.map((x, i) => (i === dayIdx ? d : x)) },
    });
    setActiveId(spot.id);
  };

  const removeStop = (id: string) => updateDay(reflowDay(day, day.stops.filter((s) => s.id !== id)));

  const replan = async (instruction: string) => {
    setMenuOpen(false);
    setReplanError(null);
    setReplanning({ places: [] });
    const idx = dayIdx;
    let done = false;
    await streamRequest("/api/replan-day", { request: trip.request, plan, dayIndex: idx, instruction }, (e) => {
      if (e.type === "progress") setReplanning({ places: e.places });
      if (e.type === "day") {
        done = true;
        updateDay(e.day, idx);
        setActiveId(null);
      }
      if (e.type === "error") setReplanError(e.message);
    }).catch(() => setReplanError(tr.replanLost));
    if (!done) setReplanError((m) => m ?? tr.replanFailed);
    setReplanning(null);
    setCustomTweak("");
  };

  const totals = useMemo(() => {
    const stops = plan.days.flatMap((d) => d.stops);
    return { stops: stops.length, gems: stops.filter((s) => s.isHiddenGem).length };
  }, [plan]);

  const shareTrip = async () => {
    setShareState({ status: "working" });
    const res = await apiPost("/api/share", { trip: { request: trip.request, plan }, existing: trip.share }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !data.id) {
      setShareState({ status: "error", message: data.message ?? tr.linkError });
      return;
    }
    if (data.id !== trip.share?.id) onChange({ ...trip, share: { id: data.id, editToken: data.editToken } });
    const url = `${window.location.origin}/t/${data.id}`;
    // Phones get the native share sheet; desktops get the link copied.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title: plan.title, text: plan.summary, url }).catch(() => {});
      setShareState({ status: "done", url, copied: false });
      return;
    }
    const copied = await navigator.clipboard.writeText(url).then(
      () => true,
      () => false,
    );
    setShareState({ status: "done", url, copied });
  };

  const onSelect = useCallback((id: string) => setActiveId((cur) => (cur === id ? null : id)), []);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
      {tour.open && (
        <Tour
          onClose={tour.close}
          steps={[
            { target: "header", ...t.tour.trip.header },
            { target: "tabs", ...t.tour.trip.tabs },
            { target: "days", ...t.tour.trip.days },
            { target: "map", ...t.tour.trip.map },
            { target: "change", ...t.tour.trip.change },
            { target: "stops", ...t.tour.trip.stops },
            { target: "tiktok", ...t.tour.trip.tiktok },
            { target: "share", ...t.tour.trip.share },
            { target: "help", ...t.tour.trip.help },
          ]}
        />
      )}
      <header className="py-6">
        <div className="flex items-center justify-between gap-3">
          {readOnly ? (
            <span />
          ) : (
            <button onClick={onBack} className="text-sm text-muted hover:text-ink">
              {tr.allTrips}
            </button>
          )}
          <div className="flex items-center gap-2">
            <LangToggle />
            <TourButton onClick={tour.start} />
          </div>
        </div>
        <div data-tour="header" className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl leading-tight break-words sm:text-5xl">{plan.title}</h1>
            <p className="mt-2 text-ink/75">{plan.summary}</p>
          </div>
          <div className="grid w-full grid-cols-4 gap-2 text-center sm:flex sm:w-auto sm:gap-3">
            {[
              [plan.days.length, tr.stats[0]],
              [totals.stops, tr.stats[1]],
              [totals.gems, tr.stats[2]],
              [plan.budget.perPersonPerDay, tr.stats[3]],
            ].map(([v, l]) => (
              <div key={String(l)} className="min-w-0 rounded-2xl border border-line bg-paper px-2 py-2 sm:px-4">
                <div className="font-display text-base break-words sm:text-xl">{v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted sm:text-[11px]">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav data-tour="tabs" className="flex w-full gap-1 rounded-full border border-line bg-paper p-1 text-sm font-medium sm:w-fit">
          {(["days", "essentials", "stay"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-3 py-2 transition sm:flex-none sm:px-4 ${tab === k ? "bg-ink text-paper" : "hover:bg-sand"}`}
            >
              {tr.tabs[k]}
            </button>
          ))}
        </nav>
          {!readOnly && (
            <>
              <button
                data-tour="tiktok"
                onClick={() => setImportOpen(true)}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-lg transition hover:scale-[1.03]"
              >
                {tr.addTikTok}
              </button>
              {canShare && (
              <div data-tour="share" className="relative">
                <button
                  onClick={shareTrip}
                  disabled={building || shareState.status === "working"}
                  className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper disabled:opacity-50"
                >
                  {shareState.status === "working" ? tr.creatingLink : trip.share ? tr.updateShare : tr.share}
                </button>
                {(shareState.status === "done" || shareState.status === "error") && (
                  <div className="animate-rise absolute left-0 z-30 mt-2 w-80 rounded-2xl border border-line bg-paper p-4 text-sm shadow-2xl sm:left-auto sm:right-0">
                    {shareState.status === "error" ? (
                      <p className="text-coral">{shareState.message}</p>
                    ) : (
                      <>
                        <p className="font-semibold">{shareState.copied ? tr.linkCopied : tr.yourLink}</p>
                        <input
                          readOnly
                          value={shareState.url}
                          onFocus={(e) => e.target.select()}
                          className="mt-2 w-full rounded-lg border border-line bg-sand px-3 py-2 text-xs"
                        />
                        <p className="mt-2 text-xs text-muted">
                          {tr.linkNote}
                        </p>
                      </>
                    )}
                    <button onClick={() => setShareState({ status: "idle" })} className="mt-2 text-xs font-medium text-muted hover:text-ink">
                      {tr.close}
                    </button>
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </header>
      {importOpen && <TikTokImport trip={trip} onAdd={addSpots} onClose={() => setImportOpen(false)} />}

      {tab === "days" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section>
            <div data-tour="days" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
              {plan.days.map((d, i) => (
                <button
                  key={d.dayNumber}
                  onClick={() => {
                    setDayIdx(i);
                    setActiveId(null);
                  }}
                  className={`shrink-0 rounded-2xl border px-4 py-2 text-left transition ${
                    i === dayIdx ? "border-coral bg-coral text-white" : "border-line bg-paper hover:border-ink/30"
                  }`}
                >
                  <div className="text-xs opacity-80">
                    {t.dayN(d.dayNumber)} {pending[i] ? <span className="inline-block animate-spin">◌</span> : d.stops.length === 0 ? "·" : ""}
                  </div>
                  <div className="text-sm font-semibold">{formatDate(d.date)}</div>
                </button>
              ))}
            </div>

            {saved.length > 0 && (
              <div className="mb-3 rounded-2xl border border-dashed border-line bg-paper/60 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{tr.savedFromTikTok(saved.length)}</div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {saved.map((s) => (
                    <div key={s.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-1.5 pr-2 text-sm">
                      {s.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumbnail} alt="" className="h-9 w-7 rounded-md object-cover" />
                      )}
                      <a href={s.videoUrl} target="_blank" rel="noopener" className="max-w-40 truncate font-medium hover:underline">
                        {s.name}
                      </a>
                      <button
                        onClick={() => placeSaved(s)}
                        disabled={!!dayPending || !!replanning}
                        className="rounded-full bg-coral px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {tr.addToDay(day.dayNumber)}
                      </button>
                      <button
                        onClick={() => onChange({ ...trip, saved: saved.filter((x) => x.id !== s.id) })}
                        aria-label={tr.remove(s.name)}
                        className="text-xs text-muted hover:text-coral"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div data-tour="stops" className="mt-2 rounded-3xl border border-line bg-paper/60 p-3 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl">{day.theme}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {day.area} · {tr.energy[day.energy]}
                  </p>
                </div>
                {!readOnly && (
                <div data-tour="change" className="relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    disabled={!!replanning || !!dayPending}
                    className="rounded-full border border-ink px-4 py-2 text-sm font-semibold transition hover:bg-ink hover:text-paper disabled:opacity-50"
                  >
                    {tr.changeDay}
                  </button>
                  {menuOpen && (
                    <div className="animate-rise absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-paper p-2 shadow-2xl">
                      {QUICK_TWEAKS.map((text, n) => (
                        <button key={text} onClick={() => replan(text)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-sand">
                          {tr.tweaks[n]}
                        </button>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (customTweak.trim().length > 1) replan(customTweak.trim());
                        }}
                        className="mt-1 border-t border-line p-2"
                      >
                        <input
                          value={customTweak}
                          onChange={(e) => setCustomTweak(e.target.value)}
                          placeholder={tr.tweakPlaceholder}
                          className="w-full rounded-lg border border-line bg-sand px-3 py-2 text-sm outline-none focus:border-ink"
                        />
                      </form>
                    </div>
                  )}
                </div>
                )}
              </div>

              {notice && <p className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{notice}</p>}
              {day.rainPlan && !replanning && (
                <p className="mt-3 rounded-xl bg-teal-soft px-3 py-2 text-sm text-teal">
                  <span className="font-semibold">{tr.ifRains}</span>
                  {day.rainPlan}
                </p>
              )}
              {replanError && <p className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{replanError}</p>}

              {dayPending ? (
                <div className="py-12 text-center">
                  <div className="animate-drift text-4xl">🧭</div>
                  <p className="mt-3 text-muted">{tr.planningDay(day.dayNumber)}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {dayPending.map((p, i) => (
                      <span key={i} className="animate-rise rounded-full border border-line bg-paper px-3 py-1 text-sm">📍 {p}</span>
                    ))}
                  </div>
                </div>
              ) : day.stops.length === 0 && !replanning ? (
                <div className="py-12 text-center">
                  <p className="text-muted">{tr.notPlanned}</p>
                  {!readOnly && (
                  <button
                    onClick={() => replan(`Plan this day from scratch: ${day.theme} in ${day.area}.`)}
                    className="mt-4 rounded-full bg-coral px-6 py-2.5 font-semibold text-white hover:opacity-90"
                  >
                    {tr.planThisDay}
                  </button>
                  )}
                </div>
              ) : replanning ? (
                <div className="py-12 text-center">
                  <div className="animate-drift text-4xl">🧭</div>
                  <p className="mt-3 text-muted">{tr.replanningDay(day.dayNumber)}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {replanning.places.map((p, i) => (
                      <span key={i} className="animate-rise rounded-full border border-line bg-paper px-3 py-1 text-sm">📍 {p}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <ol className="mt-5">
                      {day.stops.map((s, i) => (
                        <StopCard
                          key={s.id}
                          stop={s}
                          index={i}
                          city={city}
                          active={activeId === s.id}
                          onSelect={() => onSelect(s.id)}
                          readOnly={readOnly}
                          onRemove={() => removeStop(s.id)}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DndContext>
              )}
              {!readOnly && day.stops.length > 0 && !dayPending && !replanning && (
                <p className="mt-2 text-center text-xs text-muted">
                  {tr.dragHint}
                  {building && tr.othersBuilding}
                </p>
              )}
            </div>
          </section>

          <aside data-tour="map" className="order-first h-[260px] sm:h-[360px] lg:sticky lg:top-6 lg:order-none lg:h-[calc(100vh-3rem)]">
            <TripMap stops={day.stops} saved={saved} center={plan.destination} activeId={activeId} onSelect={onSelect} />
          </aside>
        </div>
      )}

      {tab === "essentials" &&
        (plan.essentials.arrival ? (
          <Essentials trip={trip} />
        ) : (
          <p className="rounded-3xl border border-line bg-paper p-8 text-center text-muted">
            {building ? tr.gatheringTips : tr.tipsFailed}
          </p>
        ))}

      {tab === "stay" && (
        <div className="max-w-3xl space-y-4">
          <div className="rounded-3xl border border-line bg-paper p-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted">{tr.baseIn}</div>
            <h2 className="mt-1 font-display text-4xl">{plan.whereToStay.area}</h2>
            <p className="mt-3 text-ink/80">{plan.whereToStay.why}</p>
            {plan.whereToStay.alternatives.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                {tr.alsoGood}
                {plan.whereToStay.alternatives.join(" · ")}
              </p>
            )}
            <a
              href={staysLink(trip)}
              target="_blank"
              rel="noopener"
              className="mt-5 inline-block rounded-full bg-coral px-6 py-3 font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90"
            >
              {tr.seeStays(plan.whereToStay.area)}
            </a>
          </div>
          <div className="rounded-3xl border border-line bg-paper p-6">
            <h3 className="font-display text-2xl">{tr.fromAirport}</h3>
            <p className="mt-2 text-ink/80">{plan.essentials.arrival || (building ? tr.workingOut : tr.notAvailable)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Essentials({ trip }: { trip: Trip }) {
  const tr = useT().trip;
  const e = trip.plan.essentials;
  const l = tr.essentials;
  const cards: [string, string, string][] = [
    ["✈️", l.arrival, e.arrival],
    ["🚇", l.gettingAround, e.gettingAround],
    ["💶", l.money, e.money],
    ["📶", l.connectivity, e.connectivity],
    ["🔌", l.power, e.power],
    ["🌤️", l.weather, e.weather],
    ["🛡️", l.safety, e.safety],
    ["🙏", l.etiquette, e.etiquette],
  ];
  return (
    <div className="space-y-6">
      {e.heads_up.length > 0 && (
        <div className="rounded-3xl border border-coral/30 bg-coral-soft p-6">
          <h3 className="font-display text-2xl text-coral">{tr.headsUp}</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {e.heads_up.map((h) => (
              <li key={h}>• {h}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([icon, title, body]) => (
          <div key={title} className="rounded-3xl border border-line bg-paper p-5">
            <div className="text-2xl">{icon}</div>
            <h4 className="mt-2 font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-ink/75">{body}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-paper p-6">
          <h3 className="font-display text-2xl">{tr.pack}</h3>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {e.packing.map((p) => (
              <li key={p}>
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="checkbox" className="mt-0.5 accent-coral" /> {p}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line bg-paper p-6">
          <h3 className="font-display text-2xl">{tr.phrases}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {e.phrases.map((p) => (
              <div key={p.phrase} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                <dt className="font-semibold">{p.phrase}</dt>
                <dd className="text-right text-muted">{p.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
