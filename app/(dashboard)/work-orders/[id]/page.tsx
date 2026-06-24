import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  updateWorkOrderNotes,
  updateWorkOrderStatus,
} from "@/app/actions/work-orders";
import { createInvoice } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getWorkOrderDetail } from "@/lib/db/queries/work-orders";
import {
  CheckCircle2,
  CircleDashed,
  CircleOff,
  ListChecks,
  ReceiptText,
  User,
  Building2,
  DollarSign,
  FileText,
  Notebook,
} from "lucide-react";

const statusMeta: Record<
  string,
  { tone: "green" | "amber" | "red" | "blue"; icon: typeof CheckCircle2 }
> = {
  pending: { tone: "amber", icon: CircleDashed },
  in_progress: { tone: "blue", icon: ListChecks },
  completed: { tone: "green", icon: CheckCircle2 },
  cancelled: { tone: "red", icon: CircleOff },
};

function invoiceTone(status: string) {
  if (status === "paid") return "green";
  if (status === "partially_paid") return "amber";
  if (status === "overdue" || status === "cancelled") return "red";
  return "blue";
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "work_orders")) redirect("/dashboard");

  const { id } = await params;
  const { workOrder, invoices } = await getWorkOrderDetail(id);
  if (!workOrder) notFound();

  const woMeta = statusMeta[workOrder.status] ?? statusMeta.pending;
  const WoStatusIcon = woMeta.icon;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-sky-200">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Work Order</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-mono">{workOrder.workOrderNumber}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400">{workOrder.title}</span>
              <Badge tone={woMeta.tone} icon={WoStatusIcon}>{workOrder.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Lead",
            value: workOrder.leadTitle || "—",
            icon: User,
            tone: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300",
            link: workOrder.leadId ? `/crm/leads/${workOrder.leadId}` : null,
          },
          {
            label: "Client",
            value: workOrder.clientName || "—",
            icon: Building2,
            tone: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300",
            link: workOrder.clientId
              ? `/crm/clients/${workOrder.clientId}`
              : null,
          },
          {
            label: "Owner",
            value: workOrder.ownerName || "—",
            icon: User,
            tone: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300",
          },
          {
            label: "Value",
            value: <Money cents={workOrder.totalValueCents} />,
            icon: DollarSign,
            tone: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          const content = (
            <div className="group relative min-h-28 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {stat.label}
                </span>
                <span className={`rounded-lg p-1.5 ${stat.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold leading-none text-slate-800">
                {stat.value}
              </p>
            </div>
          );
          if (stat.link)
            return (
              <Link
                key={stat.label}
                href={stat.link}
                className="transition hover:opacity-80"
              >
                {content}
              </Link>
            );
          return content;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-800">Invoices</h2>
              <ModalForm
                title="Create invoice"
                description="Add an invoice."
                triggerLabel="Create"
                triggerIcon={<ReceiptText className="h-4 w-4" />}
                triggerVariant="outline"
                triggerSize="lg"
                action={createInvoice}
                submitLabel="Create"
                formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
              >
                <input
                  type="hidden"
                  name="leadId"
                  value={workOrder.leadId ?? ""}
                />
                <input
                  type="hidden"
                  name="clientId"
                  value={workOrder.clientId ?? ""}
                />
                <input type="hidden" name="workOrderId" value={workOrder.id} />
                <Field
                  label="Issue date"
                  name="issueDate"
                  type="date"
                  required
                />
                <Field label="Due date" name="dueDate" type="date" />
                <Field label="Item" name="itemDescription" required />
                <Field
                  label="Qty"
                  name="quantity"
                  type="number"
                  defaultValue="1"
                  min="1"
                />
                <Field
                  label="Unit price"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  required
                />
                <Field
                  label="Discount"
                  name="discount"
                  type="number"
                  step="0.01"
                />
                <Field label="Tax" name="tax" type="number" step="0.01" />
                <div className="xl:col-span-3">
                  <TextArea label="Notes" name="notes" />
                </div>
              </ModalForm>
            </div>
            <DataTable
              headers={["Invoice", "Status"]}
              empty="No invoices."
              rows={invoices.map((inv) => {
                const invMeta = invoiceTone(inv.status);
                const InvIcon =
                  inv.status === "paid"
                    ? CheckCircle2
                    : inv.status === "overdue" || inv.status === "cancelled"
                      ? CircleOff
                      : inv.status === "partially_paid"
                        ? DollarSign
                        : ReceiptText;
                return [
                  <Link
                    key="n"
                    href={`/crm/invoices/${inv.id}`}
                    className="font-mono text-base font-black text-slate-800 transition hover:text-sky-600"
                  >
                    {inv.invoiceNumber}
                  </Link>,
                  <Badge
                    key="s"
                    tone={invMeta as "green" | "amber" | "red" | "blue"}
                    icon={InvIcon as typeof CheckCircle2}
                  >
                    {inv.status.replace("_", " ")}
                  </Badge>,
                ];
              })}
            />
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-sky-400" />
              <h2 className="text-base font-black text-slate-800">Status</h2>
            </div>
            <ToastActionForm
              action={updateWorkOrderStatus}
              successMessage="Status updated."
            >
              <input type="hidden" name="workOrderId" value={workOrder.id} />
              <Select
                name="status"
                defaultValue={workOrder.status}
                label="Change status"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <div className="mt-3">
                <SubmitButton>Update</SubmitButton>
              </div>
            </ToastActionForm>
          </div>

          <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
            <div className="mb-4 flex items-center gap-2">
              <Notebook className="h-4 w-4 text-sky-400" />
              <h2 className="text-base font-black text-slate-800">Notes</h2>
            </div>
            <ToastActionForm
              action={updateWorkOrderNotes}
              successMessage="Notes updated."
            >
              <input type="hidden" name="workOrderId" value={workOrder.id} />
              <TextArea
                name="notes"
                defaultValue={workOrder.notes ?? ""}
                label="Notes"
              />
              <div className="mt-3">
                <SubmitButton>Save</SubmitButton>
              </div>
            </ToastActionForm>
          </div>

          <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <h2 className="text-base font-black text-slate-800">Details</h2>
            </div>
            <dl className="grid gap-3 text-sm">
              {[
                [
                  "Status",
                  <Badge key="s" tone={woMeta.tone} icon={WoStatusIcon}>
                    {workOrder.status.replace("_", " ")}
                  </Badge>,
                ],
                ["Created", <DateText key="c" value={workOrder.createdAt} />],
                ["Updated", <DateText key="u" value={workOrder.updatedAt} />],
                ["Value", <Money key="v" cents={workOrder.totalValueCents} />],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-4 border-b border-sky-100 pb-2 last:border-0"
                >
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-bold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </section>
    </div>
  );
}
