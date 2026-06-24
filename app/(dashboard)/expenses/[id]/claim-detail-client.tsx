"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/page-header";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { ReceiptUpload } from "@/components/expenses/receipt-upload";
import { Money, DateText } from "@/components/ui/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  approveExpenseClaim,
  rejectExpenseClaim,
  markReimbursed,
  linkToInvoice,
  unlinkFromInvoice,
  deleteReceipt,
} from "@/app/actions/expenses";

type Claim = {
  id: string;
  claimNumber: string;
  title: string;
  description: string | null;
  totalAmountCents: number;
  status: string;
  employeeId: string;
  employeeName: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  reimbursedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ClaimItem = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryType: string | null;
  description: string;
  amountCents: number;
  expenseDate: string;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string | null;
};

type Reimbursement = {
  id: string;
  claimId: string;
  amountCents: number;
  reimbursedDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  processedBy: string | null;
  createdAt: string | null;
};

type InvoiceLink = {
  id: string;
  invoiceId: string;
  amountCents: number;
  createdAt: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  totalCents: number;
  status: string;
};

export function ClaimDetailClient({
  claim,
  items,
  reimbursements,
  invoiceLinks,
  invoices,
  isAdmin,
  isOwner,
  currentUserId,
}: {
  claim: Claim;
  items: ClaimItem[];
  reimbursements: Reimbursement[];
  invoiceLinks: InvoiceLink[];
  invoices: InvoiceRow[];
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);
  const [reimbursing, setReimbursing] = useState(false);
  const [linking, setLinking] = useState(false);

  async function handleReview(status: "approved" | "rejected") {
    setReviewing(true);
    const fd = new FormData();
    fd.set("id", claim.id);
    fd.set("status", status);
    const notes = window.prompt(`Enter notes for ${status} (optional):`);
    if (notes !== null) fd.set("adminNotes", notes || "");
    try {
      await approveExpenseClaim(fd);
      toast.success(`Claim ${status}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleReimbursed(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReimbursing(true);
    const fd = new FormData(e.currentTarget);
    try {
      await markReimbursed(fd);
      toast.success("Claim marked as reimbursed.");
      setReimbursing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
      setReimbursing(false);
    }
  }

  async function handleLinkToInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLinking(true);
    const fd = new FormData(e.currentTarget);
    fd.set("expenseClaimId", claim.id);
    try {
      await linkToInvoice(fd);
      toast.success("Linked to invoice.");
      setLinking(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link.");
      setLinking(false);
    }
  }

  async function handleUnlink(linkId: string) {
    try {
      await unlinkFromInvoice(linkId);
      toast.success("Unlinked from invoice.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/expenses"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Expenses
        </Link>
        <PageHeader
          title={`${claim.claimNumber} — ${claim.title}`}
          description={`Submitted by ${claim.employeeName ?? "Unknown"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Claim info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Claim Details</h3>
              <ExpenseStatusBadge status={claim.status} />
            </div>
            <div className="grid gap-4 text-sm">
              {claim.description ? (
                <p className="text-muted-foreground">{claim.description}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-foreground"><Money cents={claim.totalAmountCents} /></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-foreground">
                    {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString() : "Not submitted"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Items */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Expense Items</h3>
            <div className="overflow-x-auto hide-scrollbar">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-accent/50">
                      <td className="px-3 py-3 capitalize text-muted-foreground">
                        {item.categoryName ?? item.categoryType ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-foreground">{item.description}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <DateText value={item.expenseDate} />
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-foreground">
                        <Money cents={item.amountCents} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ReceiptUpload itemId={item.id} existingUrl={item.receiptUrl} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Links */}
          {invoiceLinks.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Linked Invoices</h3>
              <div className="space-y-2">
                {invoiceLinks.map((link) => {
                  const inv = invoices.find((i) => i.id === link.invoiceId);
                  return (
                    <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                      <div>
                        <Link
                          href={`/crm/invoices/${link.invoiceId}`}
                          className="font-mono text-sm font-medium text-primary hover:underline"
                        >
                          {inv?.invoiceNumber ?? link.invoiceId}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          — <Money cents={link.amountCents} />
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleUnlink(link.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Reimbursements */}
          {reimbursements.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Reimbursements</h3>
              <div className="space-y-2">
                {reimbursements.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        <Money cents={r.amountCents} />
                      </span>
                      <span className="text-muted-foreground capitalize">{r.method}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.reimbursedDate).toLocaleDateString()}
                      {r.reference ? ` — Ref: ${r.reference}` : ""}
                    </p>
                    {r.notes ? <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status info */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <ExpenseStatusBadge status={claim.status} />
              </div>
              {claim.reviewerName ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviewed by</span>
                  <span className="text-foreground">{claim.reviewerName}</span>
                </div>
              ) : null}
              {claim.adminNotes ? (
                <div>
                  <span className="text-xs text-muted-foreground">Admin notes:</span>
                  <p className="mt-1 text-foreground">{claim.adminNotes}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && claim.status === "pending" ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Review</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={reviewing}
                  onClick={() => handleReview("approved")}
                >
                  {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  disabled={reviewing}
                  onClick={() => handleReview("rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}

          {/* Reimbursement form */}
          {isAdmin && claim.status === "approved" ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Mark Reimbursed</h3>
              <form onSubmit={handleReimbursed} className="space-y-3">
                <input type="hidden" name="claimId" value={claim.id} />
                <Field name="amount" label="Amount ($)" type="number" step="0.01" required defaultValue={(claim.totalAmountCents / 100).toFixed(2)} />
                <Field name="reimbursedDate" label="Date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                <Select label="Method" name="method" required>
                  <option value="">Select method...</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </Select>
                <Field name="reference" label="Reference (optional)" />
                <Button type="submit" disabled={reimbursing} className="w-full">
                  {reimbursing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Mark as Reimbursed
                </Button>
              </form>
            </div>
          ) : null}

          {/* Link to Invoice */}
          {isAdmin && (claim.status === "approved" || claim.status === "reimbursed") ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Link to Invoice</h3>
              <form onSubmit={handleLinkToInvoice} className="space-y-3">
                <Select label="Invoice" name="invoiceId" required>
                  <option value="">Select invoice...</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber}
                    </option>
                  ))}
                </Select>
                <Field name="amountCents" label="Amount ($)" type="number" step="0.01" required defaultValue={(claim.totalAmountCents / 100).toFixed(2)} />
                <Button type="submit" disabled={linking} className="w-full">
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Link to Invoice
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
