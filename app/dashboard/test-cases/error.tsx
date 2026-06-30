"use client";

export default function TestCasesError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-espresso px-5 py-32 text-ivory sm:px-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-ember/40 bg-clay p-6 shadow-card">
        <h1 className="font-display text-2xl font-semibold text-ivory">Unable to load test cases</h1>
        <p className="mt-3 text-beige">Something interrupted the test case workspace. Try reloading the section.</p>
        <button onClick={reset} className="mt-5 rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber">Try Again</button>
      </div>
    </main>
  );
}
