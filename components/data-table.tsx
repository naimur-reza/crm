"use client";

import { ArrowDownAZ, ArrowUpAZ, FileQuestion } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

type HeaderDef = string | { label: string; key?: string; sortable?: boolean };

function normalizeHeaders(headers: HeaderDef[]): { label: string; key?: string; sortable?: boolean }[] {
  return headers.map((h) => (typeof h === "string" ? { label: h } : h));
}

export function DataTable({
  headers,
  rows,
  empty,
  sortableColumns,
  currentSort,
  selectable,
  selectedIds,
  onSelectAll,
  onSelectOne,
}: {
  headers: HeaderDef[];
  rows: ReactNode[][];
  empty: string;
  sortableColumns?: string[];
  currentSort?: { by: string; order: "asc" | "desc" };
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const normalizedHeaders = normalizeHeaders(headers);
  const isMobile = useMediaQuery("(max-width: 639px)");

  const handleSort = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams);
      if (currentSort?.by === key && currentSort.order === "asc") {
        params.set("sortBy", key);
        params.set("sortOrder", "desc");
      } else {
        params.set("sortBy", key);
        params.set("sortOrder", "asc");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, router, currentSort],
  );

  const allSelected = selectedIds && selectedIds.size === rows.length && rows.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {isMobile ? (
        <div className="divide-y divide-border sm:hidden">
          {rows.length ? (
            rows.map((row, index) => {
              const rowId = row[row.length - 1] as string;
              const actualCells = selectable ? row.slice(0, -1) : row;
              return (
                <div
                  key={index}
                  className={`p-4 transition ${
                    selectedIds?.has(rowId) ? "bg-primary/5" : ""
                  }`}
                >
                  {selectable ? (
                    <div className="mb-3 flex justify-end">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(rowId) ?? false}
                        onChange={(e) => onSelectOne?.(rowId, e.target.checked)}
                        className="h-5 w-5 rounded border-border accent-primary"
                      />
                    </div>
                  ) : null}
                  <div className="grid gap-3">
                    {actualCells.map((cell, cellIndex) => {
                      const header = normalizedHeaders[cellIndex];
                      return (
                        <div key={cellIndex} className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {header.label}
                          </span>
                          <span className="text-sm text-foreground">{cell}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-16">
              <FileQuestion className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{empty}</p>
            </div>
          )}
        </div>
      ) : null}
      <div className="overflow-x-auto max-sm:hidden">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-muted to-card">
              {selectable ? (
                <th className="sticky top-0 z-10 w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
              ) : null}
              {normalizedHeaders.map((header) => (
                <th
                  key={header.label}
                  className={`sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                    header.sortable ? "cursor-pointer select-none hover:text-foreground" : ""
                  }`}
                  onClick={() => header.sortable && header.key && handleSort(header.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {header.label}
                    {header.sortable && header.key && currentSort?.by === header.key ? (
                      currentSort.order === "asc" ? (
                        <ArrowUpAZ className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownAZ className="h-3.5 w-3.5" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length ? (
              rows.map((row, index) => {
                const rowId = row[row.length - 1] as string;
                const actualCells = selectable ? row.slice(0, -1) : row;
                return (
                  <tr
                    key={index}
                    className={`align-top transition ${
                      index % 2 === 0 ? "bg-card" : "bg-muted/50"
                    } hover:bg-accent ${
                      selectedIds?.has(rowId) ? "bg-primary/5" : ""
                    }`}
                  >
                    {selectable ? (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(rowId) ?? false}
                          onChange={(e) => onSelectOne?.(rowId, e.target.checked)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </td>
                    ) : null}
                    {actualCells.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  className="px-4 py-16 text-center"
                  colSpan={normalizedHeaders.length + (selectable ? 1 : 0)}
                >
                  <div className="flex flex-col items-center gap-3">
                    <FileQuestion className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{empty}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
