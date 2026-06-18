import { FileQuestion } from "lucide-react";
import type { ReactNode } from "react";

export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-muted to-card">
              {headers.map((header) => (
                <th
                  key={header}
                  className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className={`align-top transition ${
                    index % 2 === 0 ? "bg-card" : "bg-muted/50"
                  } hover:bg-blue-50/40`}
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-4 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-16 text-center" colSpan={headers.length}>
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
