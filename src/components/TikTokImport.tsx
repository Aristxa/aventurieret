"use client";

import { useState } from "react";
import { apiPost, formatDate, nearestDayIndex } from "@/lib/client";
import { useT } from "@/lib/i18n";
import type { ImportResult, PlaceResult, Preview } from "@/lib/tiktok";
import type { SavedSpot, Trip } from "@/lib/types";

type Target = number | "saved";

type Messages = { lostConnection: string; wentWrong: string };

async function callImport(trip: Trip, url: string, m: Messages, manualName?: string): Promise<ImportResult> {
  const res = await apiPost("/api/tiktok", {
    url,
    manualName,
    destination: `${trip.plan.destination.name}, ${trip.plan.destination.country}`,
    center: { lat: trip.plan.destination.lat, lng: trip.plan.destination.lng },
  }).catch(() => null);
  if (!res) return { ok: false, reason: "unavailable", message: m.lostConnection };
  const data = await res.json().catch(() => ({}));
  // Invite/limit errors come back as { error, message } rather than an ImportResult.
  if (!res.ok || !("ok" in data)) return { ok: false, reason: "unavailable", message: data.message ?? m.wentWrong };
  return data;
}

export function TikTokImport({
  trip,
  onAdd,
  onClose,
}: {
  trip: Trip;
  onAdd: (spots: SavedSpot[], target: Target) => void;
  onClose: () => void;
}) {
  const t = useT();
  const tt = t.tiktok;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<Target>("saved");
  const [manual, setManual] = useState<Record<number, string>>({});

  const days = trip.plan.days;
  const norm = (n: string) => n.trim().toLowerCase();
  const existing = new Set([
    ...days.flatMap((d) => d.stops.map((s) => norm(s.name))),
    ...(trip.saved ?? []).map((s) => norm(s.name)),
  ]);
  const isDup = (spot: SavedSpot) => existing.has(norm(spot.name));

  const apply = (r: ImportResult) => {
    if (r.preview) setPreview(r.preview);
    if (!r.ok) {
      setError(r.message);
      if (r.reason === "no_place") setPlaces([{ status: "not_found", name: "", message: r.message }]);
      return;
    }
    setError(null);
    setPlaces(r.places);
    const spots = r.places.flatMap((p) => ("spot" in p && !isDup(p.spot) ? [p.spot] : []));
    setPicked(new Set(spots.map((s) => s.id)));
    // One place: suggest the day it fits best. Several: park them in "saved".
    setTarget(spots.length === 1 ? nearestDayIndex(days, spots[0]) : "saved");
  };

  const submit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setPlaces(null);
    setPreview(null);
    apply(await callImport(trip, url, tt));
    setLoading(false);
  };

  // Retry one row with a name the user typed, replacing that row with the result.
  const retry = async (index: number) => {
    const name = manual[index]?.trim();
    if (!name) return;
    setLoading(true);
    const r = await callImport(trip, url, tt, name);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    const row = r.places[0];
    setPlaces((prev) => (prev ?? []).map((p, i) => (i === index ? row : p)));
    if ("spot" in row && !isDup(row.spot)) setPicked((prev) => new Set(prev).add(row.spot.id));
  };

  const chosen = (places ?? []).flatMap((p) => ("spot" in p && picked.has(p.spot.id) ? [p.spot] : []));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl">{tt.title}</h2>
            <p className="mt-1 text-sm text-muted">{tt.subtitle}</p>
          </div>
          <button onClick={onClose} aria-label={t.trip.close} className="text-muted hover:text-ink">✕</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-4 flex gap-2"
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@…/video/…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-sand px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <button
            disabled={loading || !url.trim()}
            className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {loading && !places ? tt.reading : tt.find}
          </button>
        </form>

        {error && !places && <p className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral">{error}</p>}

        {preview && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-line p-3">
            {preview.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.thumbnail} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 text-sm">
              <div className="font-semibold">@{preview.author}</div>
              <p className="mt-1 line-clamp-4 text-ink/70">{preview.caption}</p>
            </div>
          </div>
        )}

        {places && (
          <ul className="mt-4 space-y-2">
            {places.map((p, i) => (
              <li key={"spot" in p ? p.spot.id : `row-${i}`} className="rounded-xl border border-line p-3 text-sm">
                {"spot" in p ? (
                  <label className={`flex items-start gap-3 ${isDup(p.spot) ? "opacity-50" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      className="mt-1 accent-coral"
                      disabled={isDup(p.spot)}
                      checked={picked.has(p.spot.id)}
                      onChange={() =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.spot.id)) next.delete(p.spot.id);
                          else next.add(p.spot.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.spot.name}</span>
                      <span className="block text-xs text-muted">{p.spot.address}</span>
                    </span>
                    <span className={`shrink-0 text-xs ${p.status === "found" ? "text-teal" : "text-gold"}`}>
                      {isDup(p.spot) ? tt.alreadyIn : tt.status[p.status]}
                    </span>
                  </label>
                ) : (
                  <div>
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{p.name || tt.whichPlace}</span>
                      {p.name && <span className="text-xs text-coral">{p.message}</span>}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        retry(i);
                      }}
                      className="mt-2 flex gap-2"
                    >
                      <input
                        value={manual[i] ?? ""}
                        onChange={(e) => setManual((m) => ({ ...m, [i]: e.target.value }))}
                        placeholder={p.name ? tt.correctName : tt.typeName}
                        className="min-w-0 flex-1 rounded-lg border border-line bg-sand px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                      <button disabled={loading} className="rounded-lg border border-ink px-3 text-xs font-semibold disabled:opacity-40">
                        {tt.search}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {places && error && <p className="mt-3 text-sm text-coral">{error}</p>}

        {chosen.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <select
              value={String(target)}
              onChange={(e) => setTarget(e.target.value === "saved" ? "saved" : Number(e.target.value))}
              className="min-w-0 flex-1 rounded-xl border border-line bg-sand px-3 py-3 text-sm"
            >
              <option value="saved">{tt.saveForLater}</option>
              {days.map((d, i) => (
                <option key={d.dayNumber} value={i}>
                  {tt.addToDay(d.dayNumber)} · {formatDate(d.date)} · {d.area}
                </option>
              ))}
            </select>
            <button
              onClick={() => onAdd(chosen, target)}
              className="rounded-xl bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90"
            >
              {target === "saved" ? tt.save(chosen.length) : tt.add(chosen.length)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
