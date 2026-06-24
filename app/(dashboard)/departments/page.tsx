import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDepartment, deleteDepartment, updateDepartment } from "@/app/actions/departments";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { TextArea } from "@/components/ui/field";
import { Surface } from "@/components/page-header";
import { EditModal } from "@/components/edit-modal";
import { Building2 } from "lucide-react";

export default async function DepartmentsPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "departments")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await props.searchParams, 10);

  const [{ count }, rows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(departments)
      .then((r) => r[0]),
    getDb()
      .select()
      .from(departments)
      .orderBy(desc(departments.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="-m-4 grid gap-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-4 sm:-m-6 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Organization
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            Departments
          </h1>
        </div>
        <ModalForm
          title="Create department"
          description="Add a new department to the organization."
          triggerLabel="Create department"
          action={createDepartment}
          triggerVariant="default"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          <Field name="name" label="Department name" required />
          <TextArea name="description" label="Description" />
        </ModalForm>
      </div>

      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-0 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                Departments
              </p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">
                All Departments ({count})
              </h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Name", "Description", "Action"]}
            empty="No departments yet."
            rows={rows.map((dept) => [
              <div key="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <span className="font-bold text-slate-800">{dept.name}</span>
              </div>,
              <span key="desc" className="text-sm text-muted-foreground">
                {dept.description || "-"}
              </span>,
              <div key="actions" className="flex items-center gap-2">
                <EditModal
                  title="Edit department"
                  description={`Update details for ${dept.name}.`}
                  action={updateDepartment}
                >
                  <input type="hidden" name="id" value={dept.id} />
                  <Field label="Department name" name="name" defaultValue={dept.name} required />
                  <TextArea name="description" label="Description" defaultValue={dept.description ?? ""} />
                </EditModal>
                <ToastActionForm action={deleteDepartment} successMessage="Department deleted.">
                  <input type="hidden" name="id" value={dept.id} />
                  <Button type="submit" variant="destructive" size="xs">Delete</Button>
                </ToastActionForm>
              </div>,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </Surface>
    </div>
  );
}
