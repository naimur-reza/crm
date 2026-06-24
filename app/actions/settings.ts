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

export async function uploadSiteLogo(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "settings");

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File size must be under 2 MB.");

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) throw new Error("Only JPEG, PNG, WebP, and SVG are allowed.");

  const ext = file.type.split("/")[1];
  const fileName = `logo-${Date.now()}.${ext}`;

  const db = getDb();
  const existing = await db
    .select({ id: siteSettings.id, logoUrl: siteSettings.logoUrl })
    .from(siteSettings)
    .limit(1);

  const { put, del } = await import("@vercel/blob");

  const oldUrl = existing[0]?.logoUrl;
  if (oldUrl) {
    try { await del(oldUrl); } catch { /* ignore */ }
  }

  const { url } = await put(`branding/${fileName}`, file, { access: "public" });

  if (existing.length === 0) {
    await db.insert(siteSettings).values({ logoUrl: url, updatedBy: user.id });
  } else {
    await db
      .update(siteSettings)
      .set({ logoUrl: url, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing[0].id));
  }

  await logAudit(user.id, "settings.logo_updated", "site_settings", existing[0]?.id);
  revalidatePath("/settings");
}

export async function removeSiteLogo() {
  const user = await requireUser();
  requirePermission(user, "settings");

  const db = getDb();
  const existing = await db
    .select({ id: siteSettings.id, logoUrl: siteSettings.logoUrl })
    .from(siteSettings)
    .limit(1);

  if (existing[0]?.logoUrl) {
    const { del } = await import("@vercel/blob");
    try { await del(existing[0].logoUrl); } catch { /* ignore */ }
  }

  await db
    .update(siteSettings)
    .set({ logoUrl: null, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(siteSettings.id, existing[0]?.id));

  await logAudit(user.id, "settings.logo_removed", "site_settings");
  revalidatePath("/settings");
}

export async function updateLateCutoff(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "settings");

  const officeStartTime = formData.get("officeStartTime") as string;
  const gracePeriodMinutes = parseInt(formData.get("gracePeriodMinutes") as string);

  if (!/^\d{2}:\d{2}$/.test(officeStartTime)) {
    throw new Error("Office start time must be in HH:MM format.");
  }
  if (isNaN(gracePeriodMinutes) || gracePeriodMinutes < 0 || gracePeriodMinutes > 240) {
    throw new Error("Grace period must be between 0 and 240 minutes.");
  }

  const db = getDb();
  const existing = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);

  if (existing.length === 0) {
    await db.insert(siteSettings).values({ officeStartTime, gracePeriodMinutes, updatedBy: user.id });
  } else {
    await db
      .update(siteSettings)
      .set({ officeStartTime, gracePeriodMinutes, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing[0].id));
  }

  await logAudit(user.id, "settings.late_cutoff_updated", "site_settings", existing[0]?.id);
  revalidatePath("/settings");
}

export async function updateSiteCompanyName(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "settings");

  const companyName = formData.get("companyName") as string | null;
  if (!companyName || companyName.trim().length === 0) {
    throw new Error("Company name is required.");
  }

  const db = getDb();
  const existing = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .limit(1);

  if (existing.length === 0) {
    await db
      .insert(siteSettings)
      .values({ companyName: companyName.trim(), updatedBy: user.id });
  } else {
    await db
      .update(siteSettings)
      .set({ companyName: companyName.trim(), updatedBy: user.id, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing[0].id));
  }

  await logAudit(user.id, "settings.company_name_updated", "site_settings");
  revalidatePath("/settings");
}
