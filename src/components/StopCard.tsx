"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { bookingLinkFor, directionsLink, mapsLink, tiktokSearchLink, uberLink } from "@/lib/links";
import type { Stop } from "@/lib/types";

const ICONS: Record<Stop["category"], string> = {
  sight: "🏛️",
  food: "🍽️",
  cafe: "☕",
  nightlife: "🍸",
  nature: "🌳",
  museum: "🖼️",
  shopping: "🛍️",
  experience: "🎟️",
  rest: "🛋️",
  viewpoint: "🌅",
};

const LEG: Record<Stop["travelToNext"]["mode"], string> = { walk: "🚶", transit: "🚇", taxi: "🚕", none: "" };

const linkCls =
  "rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium transition hover:border-ink/50";

export function StopCard({
  stop,
  index,
  city,
  active,
  onSelect,
  onRemove,
}: {
  stop: Stop;
  index: number;
  city: string;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const booking = bookingLinkFor(stop, city);
  const leg = stop.travelToNext;

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "z-20" : ""}>
      <div className="flex gap-3">
        <div className="flex w-14 shrink-0 flex-col items-end pt-4">
          <span className="text-sm font-semibold tabular-nums">{stop.startTime}</span>
          <span className="text-xs text-muted">{stop.durationMin >= 60 ? `${Math.round(stop.durationMin / 30) / 2}h` : `${stop.durationMin}m`}</span>
        </div>

        <article
          onClick={onSelect}
          className={`group relative flex-1 cursor-pointer rounded-2xl border bg-paper p-4 transition ${
            active ? "border-coral shadow-lg shadow-coral/10" : "border-line hover:border-ink/30"
          } ${isDragging ? "rotate-1 shadow-2xl" : ""}`}
        >
          <div className="flex items-start gap-3">
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag to reorder"
              className="mt-0.5 cursor-grab touch-none text-muted/60 hover:text-ink active:cursor-grabbing"
            >
              ⋮⋮
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${stop.isHiddenGem ? "bg-gold" : "bg-ink"}`}>
                  {index + 1}
                </span>
                <h3 className="font-display text-lg leading-tight">
                  {ICONS[stop.category]} {stop.name}
                </h3>
                {stop.isHiddenGem && (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold">💎 Hidden gem</span>
                )}
                {stop.tiktokUrl && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper">▶ From TikTok</span>
                )}
                {stop.bookAhead && (
                  <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral">Book ahead</span>
                )}
                {stop.verified === false && (
                  <span title="We couldn't confirm this exact spot on the map — double-check before you go" className="text-[11px] text-muted">
                    ≈ location
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-ink/80">{stop.description}</p>

              {active && (
                <div className="animate-rise mt-3 space-y-2 text-sm">
                  <p className="text-teal">
                    <span className="font-semibold">Why you: </span>
                    {stop.whyYou}
                  </p>
                  {stop.insiderTip && (
                    <p className="rounded-xl bg-sand px-3 py-2">
                      <span className="font-semibold">💡 Insider tip: </span>
                      {stop.insiderTip}
                    </p>
                  )}
                  {stop.address && <p className="text-xs text-muted">📍 {stop.address}</p>}
                  <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    {booking && (
                      <a href={booking.href} target="_blank" rel="noopener" className="rounded-full bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                        {booking.label} ↗
                      </a>
                    )}
                    <a href={directionsLink(stop)} target="_blank" rel="noopener" className={linkCls}>Directions</a>
                    <a href={uberLink(stop)} target="_blank" rel="noopener" className={linkCls}>🚕 Ride here</a>
                    <a href={mapsLink(stop, city)} target="_blank" rel="noopener" className={linkCls}>Reviews & hours</a>
                    <a href={stop.tiktokUrl ?? tiktokSearchLink(stop, city)} target="_blank" rel="noopener" className={linkCls}>
                      {stop.tiktokUrl ? "▶ Watch your TikTok" : "▶ See it on TikTok"}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs font-medium text-muted">{stop.costEstimate}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label={`Remove ${stop.name}`}
                className="text-xs text-muted opacity-0 transition hover:text-coral group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </article>
      </div>

      {leg.mode !== "none" && (
        <div className="my-1 ml-[4.25rem] flex items-center gap-2 border-l-2 border-dashed border-line py-2 pl-4 text-xs text-muted">
          {LEG[leg.mode]} {leg.minutes} min{leg.note ? ` · ${leg.note}` : ""}
        </div>
      )}
      {leg.mode === "none" && <div className="h-3" />}
    </li>
  );
}
