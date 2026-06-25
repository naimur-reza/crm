"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  PieChart,
  Download,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPie,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Surface } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import type { ReportResult, ReportType } from "@/lib/reports";
import { ReportFilters } from "./report-filters";

const COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function formatCellValue(val: unknown, format?: string): string {
  if (val == null) return "-";
  if (format === "currency" && typeof val === "number") {
    return `$${(val / 100).toLocaleString()}`;
  }
  if (format === "number" && typeof val === "number") {
    return val.toLocaleString();
  }
  if (format === "percent" && typeof val === "number") {
    return `${val}%`;
  }
  return String(val);
}

function ChartSection({
  result,
}: {
  result: ReportResult;
}) {
  if (!result.chartData || result.chartData.length === 0) return null;

  if (result.chartType === "pie" || result.chartType === "doughnut") {
    return (
      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="mb-4 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-sky-600" />
          <h2 className="text-sm font-black text-slate-800">Distribution</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartPie>
              <Pie
                data={result.chartData as Record<string, unknown>[]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={result.chartType === "doughnut" ? 60 : 0}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {(result.chartData as { name: string; value: number }[]).map(
                  (_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ),
                )}
              </Pie>
              <Tooltip />
            </RechartPie>
          </ResponsiveContainer>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-sky-600" />
        <h2 className="text-sm font-black text-slate-800">Chart</h2>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {result.chartType === "line" ? (
            <LineChart data={result.chartData as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <BarChart data={result.chartData as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {(result.chartData as { name: string; value: number }[]).map(
                  (_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Surface>
  );
}

export function ReportClient({
  type,
  result,
  year,
  month,
  from,
  to,
  employeeId,
  departmentId,
}: {
  type: ReportType;
  result: ReportResult;
  year: number;
  month: number;
  from: string;
  to: string;
  employeeId: string;
  departmentId: string;
}) {
  const [exporting, setExporting] = useState<string | null>(null);

  const csvContent = useMemo(() => {
    const headers = result.columns.map((c) => c.label);
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const val = row[col.key];
          if (val == null) return "";
          const str = formatCellValue(val, col.format);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    );
    return [headers.join(","), ...rows].join("\r\n");
  }, [result]);

  async function handleExportCsv() {
    setExporting("csv");
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  const toneStyles: Record<string, string> = {
    green: "border-l-emerald-500 bg-emerald-50/30",
    amber: "border-l-amber-500 bg-amber-50/30",
    red: "border-l-rose-500 bg-rose-50/30",
    blue: "border-l-sky-500 bg-sky-50/30",
    purple: "border-l-violet-500 bg-violet-50/30",
  };

  return (
    <div className="grid gap-6">
      {/* Summary Cards */}
      {result.summaryCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {result.summaryCards.map((card) => {
            const tone = card.tone ?? "blue";
            return (
              <Surface
                key={card.label}
                className={`group relative min-h-28 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] border-l-4 ${toneStyles[tone] ?? ""}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold leading-none text-slate-800">
                  {card.value}
                </p>
                {card.sub && (
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {card.sub}
                  </p>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <ReportFilters
        type={type}
        year={year}
        month={month}
        from={from}
        to={to}
        employeeId={employeeId}
        departmentId={departmentId}
      />

      {/* Chart */}
      <ChartSection result={result} />

      {/* Data Table */}
      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-0 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  Data
                </p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">
                  {result.title} ({result.rows.length} records)
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting === "csv"}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
              >
                {exporting === "csv" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                CSV
              </button>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={result.columns.map((c) => c.label)}
            empty="No data found for the selected filters."
            rows={result.rows.map((row) =>
              result.columns.map((col) => {
                const val = row[col.key];
                return (
                  <span key={col.key} className="text-sm text-slate-700">
                    {formatCellValue(val, col.format)}
                  </span>
                );
              }),
            )}
          />
        </div>
      </Surface>
    </div>
  );
}
