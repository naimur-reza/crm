"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { BulkActions } from "./bulk-actions";
import type { ReactNode } from "react";

export function TaskTable({
  headers,
  rows,
  empty,
  currentSort,
  employees,
  children,
}: {
  headers: { label: string; key?: string; sortable?: boolean }[];
  rows: ReactNode[][];
  empty: string;
  currentSort: { by: string; order: "asc" | "desc" };
  employees: { id: string; name: string }[];
  children?: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleSelectAll(checked: boolean) {
    if (checked) {
      const ids = rows.map((row) => row[row.length - 1] as string);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div className="grid gap-3">
      <BulkActions
        selectedIds={Array.from(selectedIds)}
        employees={employees}
        onClear={handleClearSelection}
      />
      <DataTable
        headers={headers}
        currentSort={currentSort}
        selectable
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        empty={empty}
        rows={rows}
      />
      {children}
    </div>
  );
}
