"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Picking the right neighbourhood for each day…",
  "Checking which museums close on your dates…",
  "Working out how you get from the airport…",
  "Finding the best area to base yourself…",
  "Asking the locals where they actually eat…",
  "Timing the big sights for when the queues are short…",
];

// Shown while the trip outline is being written (~20-40s). Days then stream
// into the trip view one by one.
export function Generating({ destination }: { destination: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Eases towards ~90% over the typical outline time; never claims to finish.
  const pct = Math.round(90 * (1 - Math.exp(-elapsed / 15)));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="animate-drift text-6xl">🧭</div>
      <h2 className="mt-6 font-display text-4xl">Planning {destination}</h2>
      <p key={Math.floor(elapsed / 4)} className="animate-rise mt-3 h-6 text-muted">
        {MESSAGES[Math.floor(elapsed / 4) % MESSAGES.length]}
      </p>
      <div className="mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-coral transition-all duration-1000" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      <p className="mt-4 text-sm text-muted">Sketching the shape of your trip. Days will appear one by one.</p>
    </div>
  );
}
