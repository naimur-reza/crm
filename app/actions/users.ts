"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { idSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation/auth";

export async function createUser(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser.roles, "users");

  const parsed = userCreateSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  const [role] = await getDb()
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, parsed.role))
    .limit(1);

  if (!role) {
    throw new Error("Role seed data is missing. Run pnpm db:seed first.");
  }

  const [createdUser] = await getDb()
    .insert(users)
    .values({
      name: parsed.name,
      email: parsed.email,
      passwordHash: await hashPassword(parsed.password),
    })
    .returning({ id: users.id });

  await getDb().insert(userRoles).values({
    userId: createdUser.id,
    roleId: role.id,
  });

  await logAudit(currentUser.id, "user.created", "user", createdUser.id, {
    email: parsed.email,
    role: parsed.role,
  });
  revalidatePath("/users");
}

export async function deactivateUser(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser.roles, "users");

  const { id } = idSchema.parse({ id: formData.get("id") });
  if (id === currentUser.id) {
    throw new Error("You cannot deactivate your own account.");
  }

  await getDb()
    .update(users)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(users.id, id));
  await logAudit(currentUser.id, "user.deactivated", "user", id);
  revalidatePath("/users");
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser.roles, "users");

  const parsed = userUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  const [role] = await getDb()
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, parsed.role))
    .limit(1);

  if (!role) throw new Error("Invalid role.");

  await getDb()
    .update(users)
    .set({ name: parsed.name, email: parsed.email, updatedAt: new Date() })
    .where(eq(users.id, parsed.id));

  await getDb().delete(userRoles).where(eq(userRoles.userId, parsed.id));
  await getDb().insert(userRoles).values({ userId: parsed.id, roleId: role.id });

  await logAudit(currentUser.id, "user.updated", "user", parsed.id, { name: parsed.name, email: parsed.email, role: parsed.role });
  revalidatePath("/users");
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser.roles, "users");

  const { id } = idSchema.parse({ id: formData.get("id") });
  if (id === currentUser.id) {
    throw new Error("You cannot delete your own account.");
  }

  await getDb().delete(users).where(eq(users.id, id));
  await logAudit(currentUser.id, "user.deleted", "user", id);
  revalidatePath("/users");
}

export async function activateUser(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser.roles, "users");

  const { id } = idSchema.parse({ id: formData.get("id") });

  await getDb()
    .update(users)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(users.id, id));
  await logAudit(currentUser.id, "user.activated", "user", id);
  revalidatePath("/users");
}
