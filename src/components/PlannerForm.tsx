"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { INTERESTS, type TripRequest } from "@/lib/types";

const STEP_COUNT = 4;

function twoWeeksOut() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

const DEFAULT: TripRequest = {
  destination: "",
  startDate: twoWeeksOut(),
  days: 4,
  travelers: "couple",
  kidsAges: "",
  pace: "balanced",
  budget: "mid",
  interests: ["Food & markets", "Hidden gems"],
  mustDo: "",
  avoid: "",
  arrival: "",
  mobility: "",
  dietary: "",
  lang: "en",
};

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; hint: string; icon: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-2xl border p-4 text-left transition ${
            value === o.value
              ? "border-ink bg-ink text-paper shadow-lg"
              : "border-line bg-paper hover:border-ink/40"
          }`}
        >
          <div className="text-2xl">{o.icon}</div>
          <div className="mt-2 font-semibold">{o.label}</div>
          <div className={`text-xs ${value === o.value ? "text-paper/70" : "text-muted"}`}>{o.hint}</div>
        </button>
      ))}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{children}</div>
);

const inputCls =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none transition focus:border-ink";

export function PlannerForm({ onSubmit }: { onSubmit: (r: TripRequest) => void }) {
  const t = useT();
  const f = t.form;
  const [step, setStep] = useState(0);
  const [r, setR] = useState<TripRequest>(DEFAULT);
  const set = <K extends keyof TripRequest>(k: K, v: TripRequest[K]) => setR((p) => ({ ...p, [k]: v }));

  const canNext = step !== 0 || r.destination.trim().length >= 2;
  const last = step === STEP_COUNT - 1;

  const next = () => {
    if (!canNext) return;
    if (last) onSubmit({ ...r, destination: r.destination.trim() });
    else setStep(step + 1);
  };

  return (
    <div className="rounded-3xl border border-line bg-paper/80 p-6 shadow-xl backdrop-blur sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        {f.steps.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => (i < step || canNext) && setStep(i)}
            className="flex flex-1 flex-col gap-2 text-left"
          >
            <div className={`h-1.5 rounded-full transition ${i <= step ? "bg-coral" : "bg-line"}`} />
            <span className={`hidden text-xs font-medium sm:block ${i === step ? "text-ink" : "text-muted"}`}>{s}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        className="animate-rise space-y-6"
        key={step}
      >
        {step === 0 && (
          <>
            <div>
              <Label>{f.whereTo}</Label>
              <input
                autoFocus
                className={`${inputCls} font-display text-2xl`}
                placeholder={f.wherePlaceholder}
                value={r.destination}
                onChange={(e) => set("destination", e.target.value)}
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label>{f.arriving}</Label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                  value={r.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label>
                  {f.staying} <span className="normal-case text-ink">{t.days(r.days)}</span>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={14}
                  value={r.days}
                  onChange={(e) => set("days", Number(e.target.value))}
                  className="mt-4 w-full accent-coral"
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <Label>{f.whosGoing}</Label>
              <Choice
                value={r.travelers}
                onChange={(v) => set("travelers", v)}
                options={(
                  [
                    ["solo", "🎒"],
                    ["couple", "💞"],
                    ["friends", "🎉"],
                    ["family", "👨‍👩‍👧"],
                  ] as const
                ).map(([value, icon]) => ({ value, icon, label: f.travelers[value][0], hint: f.travelers[value][1] }))}
              />
            </div>
            {r.travelers === "family" && (
              <div className="animate-rise">
                <Label>{f.kidsAges}</Label>
                <input className={inputCls} placeholder={f.kidsPlaceholder} value={r.kidsAges} onChange={(e) => set("kidsAges", e.target.value)} />
              </div>
            )}
            <div>
              <Label>{f.mobility}</Label>
              <input
                className={inputCls}
                placeholder={f.mobilityPlaceholder}
                value={r.mobility}
                onChange={(e) => set("mobility", e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>{f.pace}</Label>
              <Choice
                value={r.pace}
                onChange={(v) => set("pace", v)}
                options={(
                  [
                    ["chill", "🌿"],
                    ["balanced", "⚖️"],
                    ["packed", "⚡"],
                  ] as const
                ).map(([value, icon]) => ({ value, icon, label: f.paces[value][0], hint: f.paces[value][1] }))}
              />
            </div>
            <div>
              <Label>{f.budget}</Label>
              <Choice
                value={r.budget}
                onChange={(v) => set("budget", v)}
                options={(
                  [
                    ["budget", "🪙"],
                    ["mid", "💳"],
                    ["luxury", "🥂"],
                  ] as const
                ).map(([value, icon]) => ({ value, icon, label: f.budgets[value][0], hint: f.budgets[value][1] }))}
              />
            </div>
            <div>
              <Label>{f.love}</Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const on = r.interests.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => set("interests", on ? r.interests.filter((x) => x !== i) : [...r.interests, i])}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        on ? "border-coral bg-coral text-white" : "border-line bg-paper hover:border-ink/40"
                      }`}
                    >
                      {f.interests[i] ?? i}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{f.mustDo}</Label>
              <textarea
                className={`${inputCls} min-h-20`}
                placeholder={f.mustDoPlaceholder}
                value={r.mustDo}
                onChange={(e) => set("mustDo", e.target.value)}
              />
            </div>
            <div>
              <Label>{f.skip}</Label>
              <input className={inputCls} placeholder={f.skipPlaceholder} value={r.avoid} onChange={(e) => set("avoid", e.target.value)} />
            </div>
            <div>
              <Label>{f.food}</Label>
              <input className={inputCls} placeholder={f.foodPlaceholder} value={r.dietary} onChange={(e) => set("dietary", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>{f.arrival}</Label>
              <input
                className={inputCls}
                placeholder={f.arrivalPlaceholder}
                value={r.arrival}
                onChange={(e) => set("arrival", e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className={`text-sm font-medium text-muted hover:text-ink ${step === 0 ? "invisible" : ""}`}
          >
            {f.back}
          </button>
          <button
            type="submit"
            disabled={!canNext}
            className="rounded-full bg-coral px-7 py-3 font-semibold text-white shadow-lg shadow-coral/30 transition hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
          >
            {last ? f.submit : f.next}
          </button>
        </div>
      </form>
    </div>
  );
}
