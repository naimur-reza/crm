import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { Shield } from "lucide-react";
import { AttendanceSettingsForm } from "@/components/attendance-settings-form";
import { BrandingSection } from "@/components/branding-form";
import { DataTable } from "@/components/data-table";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditLogs, siteSettings } from "@/lib/db/schema";

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canAccess(user, "settings")) redirect("/dashboard");

  const db = getDb();
  const [auditRows, rawSettings] = await Promise.all([
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
    db.select().from(siteSettings).limit(1).then(async (s) => {
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
    }),
  ]);

  const { companyName, logoUrl, officeStartTime, gracePeriodMinutes } = rawSettings;

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Settings
      </h1>

      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="p-4">
          <BrandingSection
            companyName={companyName}
            logoUrl={logoUrl}
          />
        </Surface>

        <Surface className="p-4">
          <AttendanceSettingsForm
            officeStartTime={officeStartTime}
            gracePeriodMinutes={gracePeriodMinutes}
          />
        </Surface>
      </div>

      <Surface className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
            <Shield className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Security Activity
          </h2>
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
    </div>
  );
}
