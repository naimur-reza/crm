import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { Activity, ArrowUpRight, Palette } from "lucide-react";
import { BrandingForm } from "@/components/branding-form";
import { DataTable } from "@/components/data-table";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getSiteSettings } from "@/app/actions/settings";
import { auditLogs, roles, userRoles } from "@/lib/db/schema";

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "settings")) redirect("/dashboard");

  const db = getDb();
  const siteSettings = await getSiteSettings();
  const [roleRows, auditRows] = await Promise.all([
    db
      .select({
        id: roles.id,
        name: roles.name,
        label: roles.label,
        description: roles.description,
        users: sql<number>`count(${userRoles.userId})::int`,
      })
      .from(roles)
      .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.id)
      .orderBy(roles.name),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
  ]);

  return (
    <div className="grid gap-6">

      <Surface className="p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Branding & Theme</h2>
            <p className="text-sm text-muted-foreground">Customise company name, logo, primary colour, font, and theme.</p>
          </div>
          <Palette className="h-5 w-5 text-muted-foreground" />
        </div>
        <BrandingForm
          companyName={siteSettings.companyName}
          primaryColor={siteSettings.primaryColor}
          fontFamily={siteSettings.fontFamily}
          theme={siteSettings.theme}
          logoUrl={siteSettings.logoUrl}
        />
      </Surface>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Access Control</h2>
              <p className="text-sm text-muted-foreground">Roles available for employee and CRM workflows.</p>
            </div>
            <Link href="/users" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Users <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable
            headers={["Role", "Users", "Purpose"]}
            empty="No roles configured."
            rows={roleRows.map((role) => [
              <div key="role">
                <p className="font-medium text-foreground">{role.label}</p>
                <p className="font-mono text-xs text-muted-foreground">{role.name}</p>
              </div>,
              <Badge key="users" tone="blue">{role.users}</Badge>,
              <span key="purpose" className="line-clamp-2 max-w-md">
                {role.description || "No description"}
              </span>,
            ])}
          />
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Security Activity</h2>
              <p className="text-sm text-muted-foreground">Latest tracked admin and CRM events.</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <DataTable
            headers={["Action", "Entity", "Time"]}
            empty="No audit activity yet."
            rows={auditRows.map((audit) => [
              <span key="action" className="font-medium text-foreground">{labelize(audit.action)}</span>,
              <Badge key="entity" tone="slate">{labelize(audit.entityType)}</Badge>,
              <DateText key="time" value={audit.createdAt} />,
            ])}
          />
        </Surface>
      </section>
    </div>
  );
}
