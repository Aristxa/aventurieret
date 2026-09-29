"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n";

export type TourStep = {
  /** Matches a `data-tour` attribute; omit for a centred intro card. */
  target?: string;
  title: string;
  body: string;
};

const seenKey = (id: string) => `wander.tour.${id}`;
const noopSubscribe = () => () => {};

/** Opens the tour on the first visit; `start` replays it. */
export function useTour(id: string) {
  // Server snapshot says "seen" so the tour only ever opens in the browser.
  const seen = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(seenKey(id)) === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [replay, setReplay] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  return {
    open: replay || (!seen && !dismissed),
    start: () => setReplay(true),
    close: () => {
      try {
        localStorage.setItem(seenKey(id), "1");
      } catch {}
      setReplay(false);
      setDismissed(true);
    },
  };
}

const findTarget = (target: string) => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  // Skip targets that aren't rendered or are hidden at this screen size.
  return el && el.getClientRects().length > 0 ? el : null;
};

const GAP = 14;
const PAD = 6;

export function Tour({ steps: allSteps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const t = useT();
  // Targets on screen once the page settles (buttons like Share load async).
  // Steps whose target never shows up (no saved trips, read-only view…) drop out.
  const [present, setPresent] = useState<Set<string> | null>(null);
  useEffect(() => {
    const id = setTimeout(
      () => setPresent(new Set(allSteps.flatMap((s) => (s.target && findTarget(s.target) ? [s.target] : [])))),
      500,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const steps = present ? allSteps.filter((s) => !s.target || present.has(s.target)) : [];
  const [i, setI] = useState(0);
  const [measured, setMeasured] = useState<{ step: number; rect: DOMRect } | null>(null);
  const step = steps[i];
  const target = step?.target;
  const last = i === steps.length - 1;

  useEffect(() => {
    const el = target ? findTarget(target) : null;
    if (!el) return;
    // Tall targets (a day's stops on a phone) show from their top edge.
    const tall = el.offsetHeight > window.innerHeight * 0.55;
    el.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
    const update = () => setMeasured({ step: i, rect: el.getBoundingClientRect() });
    const frame = requestAnimationFrame(update);
    // Content streaming in can move the target without any scroll.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observer.observe(document.body);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [target, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // No steps yet while targets are being found; don't step to -1.
      if (e.key === "ArrowRight") setI((n) => Math.max(Math.min(n + 1, steps.length - 1), 0));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, steps.length]);

  if (!step) return null;

  const rect = target && measured?.step === i ? measured.rect : null;
  // clientWidth excludes the scrollbar, so the card never tucks under it.
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const width = Math.min(360, vw - 32);

  // Put the card on whichever side of the target has more room; if the target
  // fills the screen, pin the card to the bottom edge.
  // (No transform-based centring: the rise animation owns `transform`.)
  let cardStyle: React.CSSProperties = { width, left: (vw - width) / 2, top: 0, bottom: 0, height: "fit-content", margin: "auto 0" };
  if (rect) {
    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 16), vw - width - 16);
    const above = rect.top - PAD;
    const below = vh - rect.bottom - PAD;
    // Clamped so the card stays on screen while the page is still scrolling.
    if (Math.max(above, below) < 200) cardStyle = { width, left, bottom: 16 };
    else if (below >= above) cardStyle = { width, left, top: Math.max(rect.bottom + PAD + GAP, 16) };
    else cardStyle = { width, left, bottom: Math.max(vh - rect.top + PAD + GAP, 16) };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dim everything except a rounded hole around the target. (A huge
          box-shadow does this too, but Chrome clips it unpredictably.) */}
      <svg className="pointer-events-none fixed inset-0 h-full w-full">
        <defs>
          <mask id="tour-hole">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(29, 27, 24, 0.55)" mask="url(#tour-hole)" />
      </svg>
      {rect && (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-coral"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}

      <div key={i} className="animate-rise fixed max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-paper p-5 shadow-2xl" style={cardStyle}>
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>
            {i + 1} / {steps.length}
          </span>
          {!last && (
            <button onClick={onClose} className="hover:text-ink">
              {t.tour.skip}
            </button>
          )}
        </div>
        <h2 id="tour-title" className="mt-2 font-display text-2xl leading-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-sm text-ink/75">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {steps.map((s, n) => (
              <span key={s.title} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-coral" : "w-1.5 bg-line"}`} />
            ))}
          </div>
          <div className="flex shrink-0 gap-1">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink">
                {t.tour.back}
              </button>
            )}
            <button
              autoFocus
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="whitespace-nowrap rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90"
            >
              {last ? t.tour.done : `${t.tour.next} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small round "?" button that replays a tour. */
export function TourButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      data-tour="help"
      onClick={onClick}
      aria-label={t.takeTour}
      title={t.takeTour}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold text-muted transition hover:border-ink/40 hover:text-ink"
    >
      ?
    </button>
  );
}
