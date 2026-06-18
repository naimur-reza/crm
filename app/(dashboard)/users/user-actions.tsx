"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { activateUser, deactivateUser, deleteUser, updateUser } from "@/app/actions/users";
import { SubmitButton } from "@/components/ui/submit-button";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { EditModal } from "@/components/edit-modal";
import { Field, Select } from "@/components/ui/field";
import { formatError } from "@/lib/format-error";
import { Trash2 } from "lucide-react";

export function UserActions({
  row,
  isCurrentUser,
}: {
  row: { id: string; name: string; email: string; status: string; role: string | null };
  isCurrentUser: boolean;
}) {
  const router = useRouter();

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

  return (
    <div className="flex items-center gap-2">
      {isCurrentUser ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <>
          <EditModal
            title="Edit User"
            description={`Update details for ${row.name}.`}
            action={updateUser}
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
