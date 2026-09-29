"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveTrip } from "@/lib/client";
import { useT } from "@/lib/i18n";
import type { Plan, Trip, TripRequest } from "@/lib/types";
import { TripView } from "./TripView";

// A trip opened from a share link: read-only until the visitor copies it into
// their own trips, after which it's fully editable here.
export function SharedTripView({ id, request, plan }: { id: string; request: TripRequest; plan: Plan }) {
  const t = useT();
  const router = useRouter();
  const [copy, setCopy] = useState<Trip | null>(null);

  const makeItYours = () => {
    const trip: Trip = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), request, plan };
    saveTrip(trip);
    setCopy(trip);
  };

  if (copy) {
    return (
      <TripView
        trip={copy}
        onBack={() => router.push("/")}
        onChange={(t) => {
          saveTrip(t);
          setCopy(t);
        }}
      />
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm">
            <span className="font-display text-lg font-semibold">
              {t.brand}<span className="text-coral">.</span>
            </span>{" "}
            <span className="text-muted">{t.shared.note}</span>
          </p>
          <div className="flex gap-2">
            <Link href="/" className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink/40">
              {t.shared.planOwn}
            </Link>
            <button
              onClick={makeItYours}
              className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90"
            >
              {t.shared.makeYours}
            </button>
          </div>
        </div>
      </div>
      <TripView
        key={id}
        trip={{ id: `shared-${id}`, createdAt: "", request, plan }}
        readOnly
        onBack={() => router.push("/")}
        onChange={() => {}}
      />
    </>
  );
}
