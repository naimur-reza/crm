"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { createSession, deleteSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/auth";

export type AuthActionState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function login(
  _state: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState | undefined> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user || user.status !== "active") {
    return { message: "Invalid email or password." };
  }

  const passwordMatches = await verifyPassword(user.passwordHash, parsed.data.password);

  if (!passwordMatches) {
    return { message: "Invalid email or password." };
  }

  const assignedRoles = await getDb()
    .select({ role: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  if (assignedRoles.length === 0) {
    return { message: "Your account has no role assigned. Ask an admin to update it." };
  }

  await createSession(user.id);
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
