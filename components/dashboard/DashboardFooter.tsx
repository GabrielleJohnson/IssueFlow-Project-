export function DashboardFooter() {
  return (
    <footer className="border-t border-bronze/70 bg-espresso text-beige">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="mr-1 font-semibold text-ivory">IssueFlow</span>{" "}
          QA-focused issue tracking &amp; test management.
        </p>
        <p className="md:text-right">
          Built by <span className="font-medium text-ivory">Gabrielle Johnson</span> · © 2026
        </p>
      </div>
    </footer>
  );
}
