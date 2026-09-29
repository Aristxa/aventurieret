"use client";

import { useState } from "react";
import { getInvite, saveInvite } from "@/lib/client";

export function InviteGate({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [code, setCode] = useState(getInvite);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return;
          saveInvite(code);
          onDone();
        }}
        className="animate-rise w-full max-w-sm rounded-3xl bg-paper p-6 text-center shadow-2xl"
      >
        <div className="text-4xl">🎟️</div>
        <h2 className="mt-3 font-display text-2xl">Aventurieret is invite-only for now</h2>
        <p className="mt-2 text-sm text-muted">Enter the code you were given to start planning.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          className="mt-5 w-full rounded-xl border border-line bg-sand px-4 py-3 text-center font-semibold uppercase tracking-widest outline-none focus:border-ink"
        />
        <button className="mt-4 w-full rounded-xl bg-coral py-3 font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90">
          Continue
        </button>
      </form>
    </div>
  );
}
