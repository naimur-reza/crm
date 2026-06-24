"use client";

import { activateEmployee, deactivateEmployee, deleteEmployee, updateEmployee } from "@/app/actions/employees";
import { SubmitButton } from "@/components/ui/submit-button";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { EditModal } from "@/components/edit-modal";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

export function EmployeeActions({
  employee,
  userRows,
  departmentRows,
}: {
  employee: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string;
    joiningDate: string | null;
    departmentId: string | null;
    userId: string | null;
    status: string;
  };
  userRows: { id: string; name: string; email: string }[];
  departmentRows: { id: string; name: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <EditModal
        title="Edit Employee"
        description={`Update details for ${employee.fullName}.`}
        action={updateEmployee}
        formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
      >
        <input type="hidden" name="id" value={employee.id} />
        <Field label="Full name" name="fullName" defaultValue={employee.fullName} required />
        <Field label="Email" name="email" type="email" defaultValue={employee.email} required />
        <Field label="Phone" name="phone" defaultValue={employee.phone ?? ""} />
        <Field label="Designation" name="designation" defaultValue={employee.designation} required />
        <Field label="Joining date" name="joiningDate" type="date" defaultValue={employee.joiningDate ?? ""} />
        <Select label="Department" name="departmentId" defaultValue={employee.departmentId ?? ""}>
          <option value="">No department</option>
          {departmentRows.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select label="Linked user" name="userId" defaultValue={employee.userId ?? ""}>
          <option value="">No login account</option>
          {userRows.map((userRow) => (
            <option key={userRow.id} value={userRow.id}>
              {userRow.name} ({userRow.email})
            </option>
          ))}
        </Select>
      </EditModal>
      {employee.status === "active" ? (
        <ToastActionForm action={deactivateEmployee} successMessage="Employee deactivated.">
          <input type="hidden" name="id" value={employee.id} />
          <SubmitButton variant="secondary">Deactivate</SubmitButton>
        </ToastActionForm>
      ) : (
        <ToastActionForm action={activateEmployee} successMessage="Employee activated.">
          <input type="hidden" name="id" value={employee.id} />
          <SubmitButton variant="secondary">Activate</SubmitButton>
        </ToastActionForm>
      )}
      <ToastActionForm action={deleteEmployee} successMessage="Employee deleted.">
        <input type="hidden" name="id" value={employee.id} />
        <Button type="submit" variant="destructive" size="xs">Delete</Button>
      </ToastActionForm>
    </div>
  );
}
