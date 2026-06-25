import type { ReportResult } from "./types";

export function generateCsv(result: ReportResult): string {
  const headers = result.columns.map((c) => c.label);
  const rows = result.rows.map((row) =>
    result.columns.map((col) => {
      const val = row[col.key];
      if (val == null) return "";
      if (col.format === "currency" && typeof val === "number") {
        return `$${(val / 100).toLocaleString()}`;
      }
      return String(val);
    }),
  );

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    )
    .join("\n");

  return csv;
}
