"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { FileQuestion, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/page-header";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { Money } from "@/components/ui/format";
import type { PaginationResult } from "@/lib/pagination";

type ExpenseClaim = {
  id: string;
  claimNumber: string;
  title: string;
  totalAmountCents: number;
  status: string;
  employeeId: string;
  employeeName: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date | null;
};

export function ExpensesClient({
  claims,
  currentEmployeeId,
  currentEmployeeName,
  isAdmin,
  canSubmit,
  tab,
  pagination,
}: {
  claims: ExpenseClaim[];
  currentEmployeeId: string | null;
  currentEmployeeName: string;
  isAdmin: boolean;
  canSubmit: boolean;
  tab: "my" | "pending" | "all";
  pagination: PaginationResult;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (newTab: "my" | "pending" | "all") => {
      const params = new URLSearchParams(searchParams);
      params.set("tab", newTab);
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, router],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Expense Claims"
          description="Manage your expense claims and approvals."
        />
        {isAdmin && (
          <Link
            href="/expenses/categories"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Categories
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div />
        {canSubmit && (
          <Link href="/expenses/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Expense Claim
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("my")}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === "my"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Claims
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`relative pb-2 text-sm font-medium transition-colors ${
              tab === "pending"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Approval
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`pb-2 text-sm font-medium transition-colors ${
              tab === "all"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Claims
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Claim
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Title
                </th>
                {(tab === "pending" || tab === "all") && isAdmin ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employee
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                {tab === "all" ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Review
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {claims.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FileQuestion className="h-10 w-10" />
                      <p>
                        {tab === "pending"
                          ? "No pending expense claims."
                          : "No expense claims yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((c) => (
                  <tr
                    key={c.id}
                    className="transition hover:bg-accent/50"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/expenses/${c.id}`}
                        className="font-mono text-sm font-bold text-foreground transition hover:text-primary"
                      >
                        {c.claimNumber}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-foreground">
                      {c.title}
                    </td>
                    {(tab === "pending" || tab === "all") && isAdmin ? (
                      <td className="px-4 py-4 text-muted-foreground">
                        {c.employeeName}
                      </td>
                    ) : null}
                    <td className="px-4 py-4 font-medium text-foreground">
                      <Money cents={c.totalAmountCents} />
                    </td>
                    <td className="px-4 py-4">
                      <ExpenseStatusBadge status={c.status} />
                    </td>
                    {tab === "all" ? (
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {c.reviewerName ?? "-"}
                      </td>
                    ) : null}
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {c.submittedAt
                        ? new Date(c.submittedAt).toLocaleDateString()
                        : c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString()
                          : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5">
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
