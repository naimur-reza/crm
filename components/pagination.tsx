"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  showingStart,
  showingEnd,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  showingStart: number;
  showingEnd: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [goToValue, setGoToValue] = useState("");

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams],
  );

  const goTo = useCallback(
    (p: number) => {
      const url = buildUrl({ page: String(p), pageSize: String(pageSize) });
      router.replace(url);
    },
    [buildUrl, router, pageSize],
  );

  const changePageSize = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      const url = buildUrl({ pageSize: String(newSize), page: "1" });
      router.replace(url);
    },
    [buildUrl, router],
  );

  const handleGoToPage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const p = parseInt(goToValue, 10);
      if (p >= 1 && p <= totalPages) {
        goTo(p);
        setGoToValue("");
      }
    },
    [goToValue, totalPages, goTo],
  );

  const prefetchPage = useCallback(
    (p: number) => {
      const url = buildUrl({ page: String(p), pageSize: String(pageSize) });
      router.prefetch(url);
    },
    [buildUrl, router, pageSize],
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return pages;
  }, [totalPages, page]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <p>
          {showingStart}–{showingEnd} of {total}
        </p>

          <select
            value={pageSize}
            onChange={changePageSize}
            className="min-touch-target h-7 rounded-md border border-border bg-transparent px-2 text-xs outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <form onSubmit={handleGoToPage} className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goToValue}
            onChange={(e) => setGoToValue(e.target.value)}
            placeholder={`1–${totalPages}`}
            className="min-touch-target h-7 w-16 rounded-md border border-border bg-transparent px-2 text-xs outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </form>

        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          onMouseEnter={() => page > 1 && prefetchPage(page - 1)}
          className="min-touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, idx) =>
          p === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              onMouseEnter={() => prefetchPage(p)}
              className={`min-touch-target flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-primary text-white"
                  : "border border-border hover:bg-accent"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          onMouseEnter={() => page < totalPages && prefetchPage(page + 1)}
          className="min-touch-target flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
