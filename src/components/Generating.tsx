"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

// Shown while the trip outline is being written (~20-40s). Days then stream
// into the trip view one by one.
export function Generating({ destination }: { destination: string }) {
  const t = useT();
  const messages = t.generating.messages;
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
      <h2 className="mt-6 font-display text-4xl">{t.generating.planning(destination)}</h2>
      <p key={Math.floor(elapsed / 4)} className="animate-rise mt-3 h-6 text-muted">
        {messages[Math.floor(elapsed / 4) % messages.length]}
      </p>
      <div className="mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-coral transition-all duration-1000" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      <p className="mt-4 text-sm text-muted">{t.generating.sketching}</p>
    </div>
  );
}
