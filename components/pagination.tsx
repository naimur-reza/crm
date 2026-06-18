"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const goTo = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, router, pageSize],
  );

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground">
      <p>
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <span key={p} className="flex items-center gap-1">
              {idx > 0 && arr[idx - 1] !== p - 1 ? (
                <span className="px-1 text-muted-foreground">…</span>
              ) : null}
              <button
                type="button"
                onClick={() => goTo(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                  p === page
                    ? "bg-primary text-white"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
