"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { idSchema, permissionGrantSchema } from "@/lib/validation/auth";

export async function grantUserPermission(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser, "users");

  const parsed = permissionGrantSchema.parse({
    userId: formData.get("userId"),
    permission: formData.get("permission"),
  });

  const existing = await getDb()
    .select({ id: userPermissions.id })
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, parsed.userId),
        eq(userPermissions.permission, parsed.permission),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    await getDb().insert(userPermissions).values({
      userId: parsed.userId,
      permission: parsed.permission,
      grantedBy: currentUser.id,
    });

    await logAudit(currentUser.id, "permission.granted", "user", parsed.userId, {
      permission: parsed.permission,
    });
  }

  revalidatePath("/users");
}

export async function revokeUserPermission(formData: FormData) {
  const currentUser = await requireUser();
  requirePermission(currentUser, "users");

  const parsed = permissionGrantSchema.parse({
    userId: formData.get("userId"),
    permission: formData.get("permission"),
  });

  await getDb()
    .delete(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, parsed.userId),
        eq(userPermissions.permission, parsed.permission),
      ),
    );

  await logAudit(currentUser.id, "permission.revoked", "user", parsed.userId, {
    permission: parsed.permission,
  });

  revalidatePath("/users");
}
