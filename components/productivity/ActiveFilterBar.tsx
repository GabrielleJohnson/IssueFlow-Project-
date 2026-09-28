import Link from "next/link";

type ActiveFilterBarProps = {
  items: string[];
  resetHref: string;
};

export function ActiveFilterBar({ items, resetHref }: ActiveFilterBarProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-coral/30 bg-coral/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-coral">Active view</span>
        {items.map((item) => <span key={item} className="rounded-full border border-bronze bg-espresso/70 px-3 py-1 text-xs font-semibold text-beige">{item}</span>)}
      </div>
      <Link href={resetHref} className="text-sm font-semibold text-amber transition hover:text-coral">Reset filters</Link>
    </div>
  );
}
