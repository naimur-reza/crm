"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";

export async function getSiteSettings() {
  const db = getDb();
  let settings = await db.select().from(siteSettings).limit(1);
  if (settings.length === 0) {
    const [created] = await db.insert(siteSettings).values({}).returning();
    settings = [created];
  }
  return settings[0];
}

export async function updateSiteSettings(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "settings");

  const companyName = formData.get("companyName") as string;
  const primaryColor = formData.get("primaryColor") as string;
  const fontFamily = formData.get("fontFamily") as string;
  const theme = formData.get("theme") as string;

  const db = getDb();
  let existing = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);

  if (existing.length === 0) {
    await db.insert(siteSettings).values({
      companyName: companyName || undefined,
      primaryColor: primaryColor || undefined,
      fontFamily: fontFamily || undefined,
      theme: theme || undefined,
      updatedBy: user.id,
    });
  } else {
    await db
      .update(siteSettings)
      .set({
        companyName: companyName || undefined,
        primaryColor: primaryColor || undefined,
        fontFamily: fontFamily || undefined,
        theme: theme || undefined,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, existing[0].id));
  }

  await logAudit(user.id, "settings.site_updated", "site_settings", existing[0]?.id);
  revalidatePath("/settings");
}

export async function uploadSiteLogo(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "settings");

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File size must be under 2 MB.");

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) throw new Error("Only JPEG, PNG, WebP, and SVG are allowed.");

  const ext = file.type.split("/")[1];
  const fileName = `logo-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { writeFile, mkdir, unlink } = await import("fs/promises");
  const path = await import("path");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");
  await mkdir(uploadDir, { recursive: true });

  const db = getDb();
  const existing = await db
    .select({ id: siteSettings.id, logoUrl: siteSettings.logoUrl })
    .from(siteSettings)
    .limit(1);

  const oldUrl = existing[0]?.logoUrl;
  if (oldUrl) {
    const oldPath = path.join(process.cwd(), "public", oldUrl);
    try { await unlink(oldPath); } catch { /* ignore if file gone */ }
  }

  await writeFile(path.join(uploadDir, fileName), bytes);

  const logoUrl = `/uploads/branding/${fileName}`;

  if (existing.length === 0) {
    await db.insert(siteSettings).values({ logoUrl, updatedBy: user.id });
  } else {
    await db
      .update(siteSettings)
      .set({ logoUrl, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing[0].id));
  }

  await logAudit(user.id, "settings.logo_updated", "site_settings", existing[0]?.id);
  revalidatePath("/settings");
}

export async function removeSiteLogo() {
  const user = await requireUser();
  requirePermission(user.roles, "settings");

  const db = getDb();
  const existing = await db
    .select({ id: siteSettings.id, logoUrl: siteSettings.logoUrl })
    .from(siteSettings)
    .limit(1);

  if (existing[0]?.logoUrl) {
    const { unlink } = await import("fs/promises");
    const path = await import("path");
    try { await unlink(path.join(process.cwd(), "public", existing[0].logoUrl)); } catch { /* ignore */ }
  }

  await db
    .update(siteSettings)
    .set({ logoUrl: null, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(siteSettings.id, existing[0]?.id));

  await logAudit(user.id, "settings.logo_removed", "site_settings");
  revalidatePath("/settings");
}
