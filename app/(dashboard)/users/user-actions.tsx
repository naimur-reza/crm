"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  activateUser,
  deactivateUser,
  deleteUser,
  updateUser,
} from "@/app/actions/users";
import { grantUserPermission, revokeUserPermission } from "@/app/actions/permissions";
import { SubmitButton } from "@/components/ui/submit-button";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { EditModal } from "@/components/edit-modal";
import { Field, Select } from "@/components/ui/field";
import { permissions as permissionMap } from "@/lib/auth/permissions";
import { formatError } from "@/lib/format-error";
import { Check, Lock, Trash2 } from "lucide-react";

type PermissionDef = {
  key: string;
  label: string;
};

const permissionGroups: { label: string; items: PermissionDef[] }[] = [
  {
    label: "General",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "employees", label: "Employees" },
      { key: "attendance", label: "Attendance" },
      { key: "attendance_reports", label: "Attendance Reports" },
      { key: "tasks", label: "Tasks" },
      { key: "clients", label: "Clients" },
      { key: "users", label: "Users" },
      { key: "settings", label: "Settings" },
      { key: "chat", label: "Team Chat" },
      { key: "work_orders", label: "Work Orders" },
    ],
  },
  {
    label: "CRM",
    items: [
      { key: "crm", label: "Overview" },
      { key: "crm_leads", label: "Leads" },
      { key: "crm_pipeline", label: "Pipeline" },
      { key: "crm_clients", label: "Clients" },
      { key: "crm_activities", label: "Activities" },
      { key: "crm_invoices", label: "Invoices" },
      { key: "crm_payments", label: "Payments" },
      { key: "crm_templates", label: "Templates" },
    ],
  },
];

function getRolePermissions(role: string | null): Set<string> {
  const result = new Set<string>();
  if (!role) return result;
  for (const [area, roles] of Object.entries(permissionMap)) {
    if (roles.includes(role as never)) {
      result.add(area);
    }
  }
  return result;
}

export function UserActions({
  row,
  isCurrentUser,
  permissions: initialPermissions,
}: {
  row: { id: string; name: string; email: string; status: string; role: string | null };
  isCurrentUser: boolean;
  permissions: string[];
}) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  const [saving, setSaving] = useState(false);

  const rolePerms = getRolePermissions(row.role);

  async function handleDelete(formData: FormData) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteUser(formData);
      toast.success("User deleted.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  async function handleSave(formData: FormData) {
    setSaving(true);
    try {
      await updateUser(formData);

      const initialSet = new Set(initialPermissions);
      const currentSet = new Set(permissions);

      for (const perm of permissions) {
        if (!initialSet.has(perm)) {
          const fd = new FormData();
          fd.set("userId", row.id);
          fd.set("permission", perm);
          await grantUserPermission(fd);
        }
      }
      for (const perm of initialPermissions) {
        if (!currentSet.has(perm)) {
          const fd = new FormData();
          fd.set("userId", row.id);
          fd.set("permission", perm);
          await revokeUserPermission(fd);
        }
      }

      setSaving(false);
    } catch (caught) {
      setSaving(false);
      throw caught;
    }
  }

  function togglePermission(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isCurrentUser ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <>
          <EditModal
            title="Edit User"
            description={`Update details for ${row.name}.`}
            action={handleSave}
            submitLabel={saving ? "Saving..." : "Save"}
            formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={row.id} />
            <Field label="Name" name="name" defaultValue={row.name} required />
            <Field label="Email" name="email" type="email" defaultValue={row.email} required />
            <Select label="Role" name="role" defaultValue={row.role ?? "employee"}>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="sales">Sales</option>
            </Select>
            <div className="col-span-full border-t border-border pt-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Module Permissions</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Permissions inherited from the user&apos;s role cannot be removed. Toggle additional
                module access below.
              </p>
              <div className="grid gap-4">
                {permissionGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item) => {
                        const fromRole = rolePerms.has(item.key);
                        const granted = permissions.includes(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              fromRole
                                ? "border-sky-200 bg-sky-50 text-sky-800"
                                : granted
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-border hover:bg-accent"
                            }`}
                          >
                            {fromRole ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded bg-sky-200 text-sky-700">
                                <Lock className="h-3 w-3" />
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={granted}
                                onChange={() => togglePermission(item.key)}
                                className="h-4 w-4 rounded border-border accent-emerald-600"
                              />
                            )}
                            <span className="flex-1">{item.label}</span>
                            {fromRole && (
                              <span className="rounded bg-sky-200/60 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                                role
                              </span>
                            )}
                            {granted && !fromRole && (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </EditModal>
          {row.status === "active" ? (
            <ToastActionForm action={deactivateUser} successMessage="User deactivated.">
              <input type="hidden" name="id" value={row.id} />
              <SubmitButton variant="secondary">Deactivate</SubmitButton>
            </ToastActionForm>
          ) : (
            <ToastActionForm action={activateUser} successMessage="User activated.">
              <input type="hidden" name="id" value={row.id} />
              <SubmitButton variant="secondary">Activate</SubmitButton>
            </ToastActionForm>
          )}
          <form action={handleDelete}>
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
