"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  FileQuestion,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Pagination } from "@/components/pagination";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { PageHeader } from "@/components/page-header";
import type { PaginationResult } from "@/lib/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approveLeaveRequest, cancelLeaveRequest, submitLeaveRequest } from "@/app/actions/leaves";

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  adminNotes: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date | null;
};

type LeaveBalance = {
  id: string;
  employeeId: string;
  year: number;
  leaveType: string;
  totalDays: number;
  usedDays: number;
};

const statusTone: Record<string, "amber" | "green" | "red" | "slate" | "blue"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "slate",
};

const leaveTypeLabels: Record<string, string> = {
  sick: "Sick",
  casual: "Casual",
  annual: "Annual",
  unpaid: "Unpaid",
  other: "Other",
};

function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone[status] ?? "slate"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function LeaveBalanceCard({ balances, year }: { balances: LeaveBalance[]; year: number }) {
  const allTypes = ["sick", "casual", "annual", "unpaid", "other"];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Leave Balance {year}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {allTypes.map((type) => {
          const bal = balances.find((b) => b.leaveType === type);
          const used = bal?.usedDays ?? 0;
          const total = bal?.totalDays ?? 0;
          const remaining = total - used;
          return (
            <div key={type} className="rounded-lg border border-border bg-muted/50 p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground capitalize">{leaveTypeLabels[type]}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{remaining}</p>
              <p className="text-xs text-muted-foreground">of {total} days</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewLeaveRequestDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await submitLeaveRequest(formData);
      toast.success("Leave request submitted.");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        New Leave Request
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>
            Submit a leave request for review by HR or Admin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <div className="grid gap-x-6 gap-y-5 px-1">
            <Select label="Leave Type" name="leaveType" required>
              <option value="">Select type...</option>
              <option value="sick">Sick</option>
              <option value="casual">Casual</option>
              <option value="annual">Annual</option>
              <option value="unpaid">Unpaid</option>
              <option value="other">Other</option>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" name="startDate" type="date" required />
              <Field label="End Date" name="endDate" type="date" required />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Reason</label>
              <textarea
                name="reason"
                required
                rows={3}
                className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 focus-visible:border-ring focus-visible:ring-ring/50 placeholder:text-muted-foreground disabled:opacity-50"
                placeholder="Explain the reason for your leave..."
              />
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApproveRejectButtons({ requestId }: { requestId: string }) {
  const router = useRouter();

  async function handleReview(status: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("id", requestId);
    fd.set("status", status);
    const notes = window.prompt(`Enter notes for ${status} leave (optional):`);
    if (notes !== null) fd.set("adminNotes", notes || "");
    try {
      await approveLeaveRequest(fd);
      toast.success(`Leave ${status}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review.");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="default"
        size="xs"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => handleReview("approved")}
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => handleReview("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}

function MyRequestActions({ request, currentEmployeeId }: { request: LeaveRequest; currentEmployeeId: string | null }) {
  if (request.status !== "pending") return null;
  if (request.employeeId !== currentEmployeeId) return null;
  return (
    <ToastActionForm action={cancelLeaveRequest} successMessage="Leave cancelled.">
      <input type="hidden" name="id" value={request.id} />
      <SubmitButton variant="ghost" size="xs">Cancel</SubmitButton>
    </ToastActionForm>
  );
}

export function LeavesClient({
  requests,
  balances,
  currentEmployeeId,
  currentEmployeeName,
  isAdmin,
  canSubmit,
  year,
  tab,
  pagination,
}: {
  requests: LeaveRequest[];
  balances: LeaveBalance[];
  currentEmployeeId: string | null;
  currentEmployeeName: string;
  isAdmin: boolean;
  canSubmit: boolean;
  year: number;
  tab: "my" | "pending";
  pagination: PaginationResult;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (newTab: "my" | "pending") => {
      const params = new URLSearchParams(searchParams);
      params.set("tab", newTab);
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, searchParams, router],
  );

  const pendingCount = pagination.total;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        description="Manage your leave requests and approvals."
      />

      <div className="flex items-center justify-between">
        <div />
        {canSubmit && <NewLeaveRequestDialog employeeId={currentEmployeeId!} />}
      </div>

      <LeaveBalanceCard balances={balances} year={year} />

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
          My Requests
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
            Pending Reviews
            {tab === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-muted">
                {isAdmin && tab === "pending" ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employee
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                {isAdmin && tab === "pending" ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tab === "my" ? "Actions" : "Reviewer"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FileQuestion className="h-10 w-10" />
                      <p>
                        {tab === "pending"
                          ? "No pending leave requests."
                          : "No leave requests yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    className="transition hover:bg-accent/50"
                  >
                    {isAdmin && tab === "pending" ? (
                      <td className="px-4 py-4 font-medium text-foreground">
                        {r.employeeName}
                      </td>
                    ) : null}
                    <td className="px-4 py-4 capitalize text-foreground">
                      {leaveTypeLabels[r.leaveType] ?? r.leaveType}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {r.startDate} &mdash; {r.endDate}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-muted-foreground">
                      {r.reason}
                    </td>
                    <td className="px-4 py-4">
                      <LeaveStatusBadge status={r.status} />
                      {r.adminNotes && r.status !== "pending" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.adminNotes}
                        </p>
                      ) : null}
                    </td>
                    {isAdmin && tab === "pending" ? (
                      <td className="px-4 py-4">
                        <ApproveRejectButtons requestId={r.id} />
                      </td>
                    ) : null}
                    <td className="px-4 py-4">
                      {tab === "my" ? (
                        <MyRequestActions request={r} currentEmployeeId={currentEmployeeId} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.reviewerName ?? "-"}
                        </span>
                      )}
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
