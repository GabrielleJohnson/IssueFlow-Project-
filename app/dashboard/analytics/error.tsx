"use client";

export default function AnalyticsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-espresso px-5 text-ivory">
      <div className="max-w-lg rounded-lg border border-ember/40 bg-clay p-8 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">Analytics unavailable</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">The report could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-beige">Your IssueFlow data is unchanged. Try loading the analytics report again.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber">Try again</button>
      </div>
    </main>
  );
}
