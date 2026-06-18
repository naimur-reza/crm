"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";

const updateNameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").trim(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function updateProfileName(formData: FormData) {
  const user = await requireUser();

  const parsed = updateNameSchema.parse({
    name: formData.get("name"),
  });

  await getDb()
    .update(users)
    .set({ name: parsed.name, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit(user.id, "user.profile_updated", "user", user.id, {
    name: parsed.name,
  });

  revalidatePath("/settings/profile");
}

export async function updateProfilePassword(formData: FormData) {
  const user = await requireUser();

  const parsed = updatePasswordSchema.parse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  const [dbUser] = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) throw new Error("User not found.");

  const valid = await verifyPassword(dbUser.passwordHash, parsed.currentPassword);
  if (!valid) throw new Error("Current password is incorrect.");

  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit(user.id, "user.password_changed", "user", user.id);
  revalidatePath("/settings/profile");
}

export async function uploadAvatar(formData: FormData) {
  const user = await requireUser();

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File size must be under 2 MB.");

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Only JPEG, PNG, and WebP are allowed.");

  const ext = file.type.split("/")[1];
  const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { writeFile, mkdir, unlink } = await import("fs/promises");
  const path = await import("path");

  const [existing] = await getDb()
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (existing?.avatarUrl) {
    try { await unlink(path.join(process.cwd(), "public", existing.avatarUrl)); } catch { /* ignore */ }
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);

  const avatarUrl = `/uploads/avatars/${fileName}`;

  await getDb()
    .update(users)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit(user.id, "user.avatar_updated", "user", user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/");
}

export async function removeAvatar() {
  const user = await requireUser();

  await getDb()
    .update(users)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await logAudit(user.id, "user.avatar_removed", "user", user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/");
}
