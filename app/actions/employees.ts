"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { employeeIdSchema, employeeSchema, employeeUpdateSchema } from "@/lib/validation/employees";

export async function createEmployee(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "employees");

  const parsed = employeeSchema.parse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    designation: formData.get("designation"),
    joiningDate: formData.get("joiningDate") || undefined,
    departmentId: formData.get("departmentId") || "",
    userId: formData.get("userId") || "",
  });

  const [employee] = await getDb()
    .insert(employees)
    .values({
      ...parsed,
      departmentId: parsed.departmentId || null,
      userId: parsed.userId || null,
    })
    .returning({ id: employees.id });

  await logAudit(user.id, "employee.created", "employee", employee.id, {
    email: parsed.email,
  });
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

export async function deactivateEmployee(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "employees");

  const { id } = employeeIdSchema.parse({ id: formData.get("id") });
  await getDb()
    .update(employees)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(employees.id, id));
  await logAudit(user.id, "employee.deactivated", "employee", id);
  revalidatePath("/employees");
}

export async function updateEmployee(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "employees");

  const parsed = employeeUpdateSchema.parse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    designation: formData.get("designation"),
    joiningDate: formData.get("joiningDate") || undefined,
    departmentId: formData.get("departmentId") || "",
    userId: formData.get("userId") || "",
  });

  await getDb()
    .update(employees)
    .set({
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone || null,
      designation: parsed.designation,
      joiningDate: parsed.joiningDate || null,
      departmentId: parsed.departmentId || null,
      userId: parsed.userId || null,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, parsed.id));

  await logAudit(user.id, "employee.updated", "employee", parsed.id, { fullName: parsed.fullName, email: parsed.email });
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

export async function activateEmployee(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "employees");

  const { id } = employeeIdSchema.parse({ id: formData.get("id") });
  await getDb()
    .update(employees)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(employees.id, id));
  await logAudit(user.id, "employee.activated", "employee", id);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

export async function deleteEmployee(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "employees");

  const { id } = employeeIdSchema.parse({ id: formData.get("id") });
  await getDb().delete(employees).where(eq(employees.id, id));
  await logAudit(user.id, "employee.deleted", "employee", id);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}
