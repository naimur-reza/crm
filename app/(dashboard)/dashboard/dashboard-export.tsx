"use client";

import { BarChart3 } from "lucide-react";

export function DashboardExportButton() {
  return (
    <a
      href="/api/dashboard/pdf"
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
    >
      <BarChart3 className="h-4 w-4" />
      Export PDF
    </a>
  );
}
