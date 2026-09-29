"use client";

import { useEffect } from "react";
import { setLang, useLang, useT, type Lang } from "@/lib/i18n";

const OPTIONS: [Lang, string][] = [
  ["en", "EN"],
  ["sq", "SQ"],
];

export function LangToggle() {
  const lang = useLang();
  const t = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div data-tour="lang" role="group" aria-label={t.language} className="flex rounded-full border border-line bg-paper p-0.5 text-xs font-semibold">
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          title={value === "en" ? "English" : "Shqip"}
          className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${lang === value ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
