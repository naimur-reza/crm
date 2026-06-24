"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import {
  departmentIdSchema,
  departmentSchema,
  departmentUpdateSchema,
} from "@/lib/validation/departments";

export async function createDepartment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "departments");

  const parsed = departmentSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const [department] = await getDb()
    .insert(departments)
    .values(parsed)
    .returning({ id: departments.id });

  await logAudit(user.id, "department.created", "department", department.id, {
    name: parsed.name,
  });
  revalidatePath("/departments");
}

export async function updateDepartment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "departments");

  const parsed = departmentUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  await getDb()
    .update(departments)
    .set({
      name: parsed.name,
      description: parsed.description || null,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, parsed.id));

  await logAudit(user.id, "department.updated", "department", parsed.id, {
    name: parsed.name,
  });
  revalidatePath("/departments");
}

export async function deleteDepartment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "departments");

  const { id } = departmentIdSchema.parse({ id: formData.get("id") });
  await getDb().delete(departments).where(eq(departments.id, id));

  await logAudit(user.id, "department.deleted", "department", id);
  revalidatePath("/departments");
}
