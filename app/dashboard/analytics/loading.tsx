export default function AnalyticsLoading() {
  return (
    <main className="min-h-screen bg-espresso px-5 pb-20 pt-32 text-ivory sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-32 rounded bg-bronze" /><div className="mt-4 h-10 max-w-xl rounded bg-clay" /><div className="mt-3 h-5 max-w-2xl rounded bg-clay" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 rounded-lg border border-bronze bg-clay" />)}</div>
        <div className="mt-8 grid gap-6 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-96 rounded-lg border border-bronze bg-clay" />)}</div>
      </div>
    </main>
  );
}
