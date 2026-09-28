import Link from "next/link";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  hrefForPage: (page: number) => string;
};

export function ListPagination({ page, totalPages, total, from, to, hrefForPage }: ListPaginationProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-bronze px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-beige">{total ? `Showing ${from}-${to} of ${total}` : "Showing 0 results"}</p>
      <nav aria-label="Pagination" className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className="rounded-full border border-bronze px-4 py-2 text-sm font-semibold text-ivory transition hover:border-amber hover:text-amber">Previous</Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-full border border-bronze/50 px-4 py-2 text-sm font-semibold text-beige/50">Previous</span>
        )}
        <span className="min-w-24 text-center text-sm font-semibold text-beige">Page {page} of {totalPages}</span>
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className="rounded-full border border-bronze px-4 py-2 text-sm font-semibold text-ivory transition hover:border-amber hover:text-amber">Next</Link>
        ) : (
          <span aria-disabled="true" className="cursor-not-allowed rounded-full border border-bronze/50 px-4 py-2 text-sm font-semibold text-beige/50">Next</span>
        )}
      </nav>
    </div>
  );
}
