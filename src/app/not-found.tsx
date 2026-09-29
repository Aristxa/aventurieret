import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="mt-6 font-display text-4xl">This trip wandered off</h1>
      <p className="mt-3 text-muted">
        The link may be mistyped, or the shared trip has expired. You can plan a fresh one in about a minute.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-coral px-7 py-3 font-semibold text-white shadow-lg shadow-coral/30 hover:opacity-90"
      >
        ✨ Plan a trip
      </Link>
    </main>
  );
}
