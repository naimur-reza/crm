import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, Building2, User } from "lucide-react";
import { updateWorkOrderNotes, updateWorkOrderStatus } from "@/app/actions/work-orders";
import { createInvoice } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { ActionButton } from "@/components/ui/action-button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, leads } from "@/lib/db/schema";
import { getWorkOrderDetail } from "@/lib/db/queries/work-orders";

function workOrderTone(status: string) {
  if (status === "completed") return "green";
  if (status === "in_progress") return "blue";
  if (status === "cancelled") return "red";
  return "amber";
}

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

  return (
    <div className="grid gap-6">
      <PageHeader
        title={workOrder.workOrderNumber}
        description={workOrder.title}
        backHref="/work-orders"
        action={<Badge tone={workOrderTone(workOrder.status)}>{workOrder.status.replace("_", " ")}</Badge>}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <Surface className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Work Order</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{workOrder.title}</h2>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Created <DateText value={workOrder.createdAt} /></p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {workOrder.leadId ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">Lead</p>
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <Link
                    href={`/crm/leads/${workOrder.leadId}`}
                    className="mt-2 block font-semibold text-slate-950 transition hover:text-[#3995d2]"
                  >
                    {workOrder.leadTitle}
                  </Link>
                  {workOrder.leadCompanyName ? (
                    <p className="text-sm text-slate-500">{workOrder.leadCompanyName}</p>
                  ) : null}
                </div>
              ) : null}

              {workOrder.clientId ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">Client</p>
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <Link
                    href={`/crm/clients/${workOrder.clientId}`}
                    className="mt-2 block font-semibold text-slate-950 transition hover:text-[#3995d2]"
                  >
                    {workOrder.clientName}
                  </Link>
                </div>
              ) : null}

              {workOrder.ownerName ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-500">Owner</p>
                  <p className="mt-2 font-semibold text-slate-950">{workOrder.ownerName}</p>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-500">Total Value</p>
                <Money cents={workOrder.totalValueCents} />
              </div>
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Invoices</h2>
              <ModalForm
                title="Create invoice"
                description="Add an invoice to this work order."
                triggerLabel="Create invoice"
                action={createInvoice}
                submitLabel="Create invoice"
                formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
              >
                <input type="hidden" name="leadId" value={workOrder.leadId ?? ""} />
                <input type="hidden" name="clientId" value={workOrder.clientId ?? ""} />
                <input type="hidden" name="workOrderId" value={workOrder.id} />
                <Field label="Issue date" name="issueDate" type="date" required />
                <Field label="Due date" name="dueDate" type="date" />
                <Field label="Item" name="itemDescription" required />
                <Field label="Quantity" name="quantity" type="number" defaultValue="1" min="1" />
                <Field label="Unit price" name="unitPrice" type="number" step="0.01" required />
                <Field label="Discount" name="discount" type="number" step="0.01" />
                <Field label="Tax" name="tax" type="number" step="0.01" />
                <div className="xl:col-span-3">
                  <TextArea label="Notes" name="notes" />
                </div>
              </ModalForm>
            </div>

            <DataTable
              headers={["Invoice", "Status", "Total", ""]}
              empty="No invoices linked to this work order."
              rows={invoices.map((inv) => [
                <Link
                  key="number"
                  href={`/crm/invoices/${inv.id}`}
                  className="font-mono font-semibold text-slate-950 transition hover:text-[#3995d2]"
                >
                  {inv.invoiceNumber}
                </Link>,
                <Badge key="status" tone={invoiceTone(inv.status)}>{inv.status.replace("_", " ")}</Badge>,
                <div key="total" className="grid gap-1">
                  <Money cents={inv.totalCents} />
                  <span className="text-xs text-slate-500">
                    Paid <Money cents={inv.paidCents} />
                  </span>
                </div>,
                <Link
                  key="open"
                  href={`/crm/invoices/${inv.id}`}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#3995d2] px-3 text-xs font-semibold text-white transition hover:bg-[#2f80bd]"
                >
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>,
              ])}
            />
          </Surface>

          {workOrder.notes ? (
            <Surface className="p-5">
              <h2 className="font-semibold text-slate-950">Notes</h2>
              <p className="mt-3 text-sm text-slate-600">{workOrder.notes}</p>
            </Surface>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Status</h2>
            <div className="mt-4 grid gap-2">
              <ToastActionForm action={updateWorkOrderStatus} successMessage="Status updated.">
                <input type="hidden" name="workOrderId" value={workOrder.id} />
                <Select name="status" defaultValue={workOrder.status} label="Change status">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <ActionButton>Update</ActionButton>
              </ToastActionForm>
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Notes</h2>
            <div className="mt-4">
              <ToastActionForm action={updateWorkOrderNotes} successMessage="Notes updated.">
                <input type="hidden" name="workOrderId" value={workOrder.id} />
                <TextArea name="notes" defaultValue={workOrder.notes ?? ""} label="Notes" placeholder="Add notes..." />
                <ActionButton>Save notes</ActionButton>
              </ToastActionForm>
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Details</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["Status", <Badge key="status" tone={workOrderTone(workOrder.status)}>{workOrder.status.replace("_", " ")}</Badge>],
                ["Created", <DateText key="created" value={workOrder.createdAt} />],
                ["Updated", <DateText key="updated" value={workOrder.updatedAt} />],
                ["Value", <Money key="value" cents={workOrder.totalValueCents} />],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
          </Surface>
        </aside>
      </section>
    </div>
  );
}
