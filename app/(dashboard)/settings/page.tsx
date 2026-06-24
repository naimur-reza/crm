import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import {
  Activity,
  ArrowUpRight,
  Building2,
  ImageIcon,
  Shield,
  Users,
} from "lucide-react";
import { AttendanceSettingsForm } from "@/components/attendance-settings-form";
import { BrandingSection } from "@/components/branding-form";
import { DataTable } from "@/components/data-table";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditLogs, roles, siteSettings, userRoles } from "@/lib/db/schema";

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canAccess(user, "settings")) redirect("/dashboard");

  const db = getDb();
  const [roleRows, auditRows, rawSettings] = await Promise.all([
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
    (async () => {
      let s = await db.select().from(siteSettings).limit(1);
      if (s.length === 0) {
        const [created] = await db.insert(siteSettings).values({}).returning();
        s = [created];
      }
      return {
        companyName: s[0].companyName,
        logoUrl: s[0].logoUrl,
        officeStartTime: s[0].officeStartTime,
        gracePeriodMinutes: s[0].gracePeriodMinutes,
      };
    })(),
  ]);

  const {
    companyName,
    logoUrl,
    officeStartTime,
    gracePeriodMinutes,
  } = rawSettings;

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
      </div>

      <Surface className="p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Branding</h2>
          </div>
        </div>
        <div className="pt-5">
          <BrandingSection
            companyName={companyName}
            logoUrl={logoUrl}
          />
        </div>
      </Surface>

      <Surface className="p-6">
        <AttendanceSettingsForm
          officeStartTime={officeStartTime}
          gracePeriodMinutes={gracePeriodMinutes}
        />
      </Surface>

      <section className="grid gap-6 xl:grid-cols-2">
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Access Control</h2>
              </div>
            </div>
            <Link
              href="/users"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Users <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable
            headers={["Role", "Users", "Purpose"]}
            empty="No roles configured."
            rows={roleRows.map((role) => [
              <div key="role">
                <p className="font-medium text-foreground">{role.label}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {role.name}
                </p>
              </div>,
              <Badge key="users" tone="blue">
                {role.users}
              </Badge>,
              <span key="purpose" className="line-clamp-2 max-w-md">
                {role.description || "No description"}
              </span>,
            ])}
          />
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">
                  Security Activity
                </h2>
              </div>
          </div>
          <DataTable
            headers={["Action", "Entity", "Time"]}
            empty="No audit activity yet."
            rows={auditRows.map((audit) => [
              <span key="action" className="font-medium text-foreground">
                {labelize(audit.action)}
              </span>,
              <Badge key="entity" tone="slate">
                {labelize(audit.entityType)}
              </Badge>,
              <DateText key="time" value={audit.createdAt} />,
            ])}
          />
        </Surface>
      </section>
    </div>
  );
}
