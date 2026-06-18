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
  if (!canAccess(user.roles, "work_orders")) redirect("/dashboard");

  const { id } = await params;
  const { workOrder, invoices } = await getWorkOrderDetail(id);
  if (!workOrder) notFound();

  const woMeta = statusMeta[workOrder.status] ?? statusMeta.pending;
  const WoStatusIcon = woMeta.icon;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground font-mono">
              {workOrder.workOrderNumber}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{workOrder.title}</span>
              <Badge tone={woMeta.tone} icon={WoStatusIcon}>
                {workOrder.status.replace("_", " ")}
              </Badge>
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
            tone: "bg-sky-50 text-sky-600",
            link: workOrder.leadId ? `/crm/leads/${workOrder.leadId}` : null,
          },
          {
            label: "Client",
            value: workOrder.clientName || "—",
            icon: Building2,
            tone: "bg-violet-50 text-violet-600",
            link: workOrder.clientId
              ? `/crm/clients/${workOrder.clientId}`
              : null,
          },
          {
            label: "Owner",
            value: workOrder.ownerName || "—",
            icon: User,
            tone: "bg-amber-50 text-amber-600",
          },
          {
            label: "Value",
            value: <Money cents={workOrder.totalValueCents} />,
            icon: DollarSign,
            tone: "bg-emerald-50 text-emerald-600",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          const content = (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
                <span className={`rounded-lg p-1.5 ${stat.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">
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
          <Surface className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Invoices</h2>
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
                    className="font-mono font-semibold text-foreground transition hover:text-primary"
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
          </Surface>
        </div>

        <aside className="grid content-start gap-4">
          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Status</h2>
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
          </Surface>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Notebook className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Notes</h2>
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
          </Surface>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Details</h2>
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
                  className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>
        </aside>
      </section>
    </div>
  );
}
