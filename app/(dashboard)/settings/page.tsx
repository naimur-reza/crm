import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Database,
  MessageSquareText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  auditLogs,
  crmStages,
  departments,
  notificationTemplates,
  roles,
  userRoles,
} from "@/lib/db/schema";

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "settings")) redirect("/dashboard");

  const db = getDb();
  const [roleRows, stageRows, templateRows, departmentRows, auditRows] = await Promise.all([
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
      .orderBy(asc(roles.name)),
    db
      .select({
        id: crmStages.id,
        name: crmStages.name,
        probability: crmStages.probability,
        color: crmStages.color,
        isWon: crmStages.isWon,
        isLost: crmStages.isLost,
      })
      .from(crmStages)
      .where(sql`${crmStages.name} <> 'Negotiation'`)
      .orderBy(asc(crmStages.sortOrder)),
    db
      .select({
        id: notificationTemplates.id,
        name: notificationTemplates.name,
        key: notificationTemplates.key,
        channel: notificationTemplates.channel,
      })
      .from(notificationTemplates)
      .orderBy(asc(notificationTemplates.name)),
    db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
      })
      .from(departments)
      .orderBy(asc(departments.name)),
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

  const overviewCards = [
    {
      label: "Roles",
      value: roleRows.length,
      helper: "Access profiles",
      icon: ShieldCheck,
      tone: "bg-sky-50 text-sky-700",
      href: "/users",
    },
    {
      label: "Pipeline stages",
      value: stageRows.length,
      helper: "Active board steps",
      icon: Workflow,
      tone: "bg-emerald-50 text-emerald-700",
      href: "/crm/pipeline",
    },
    {
      label: "Templates",
      value: templateRows.length,
      helper: "WhatsApp messages",
      icon: MessageSquareText,
      tone: "bg-violet-50 text-violet-700",
      href: "/crm/templates",
    },
    {
      label: "Departments",
      value: departmentRows.length,
      helper: "Company structure",
      icon: Building2,
      tone: "bg-amber-50 text-amber-700",
      href: "/employees",
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        description="Manage operational configuration, access control, CRM defaults, and communication setup."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Surface className="h-full p-5 transition hover:border-[#3995d2] hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
                  </div>
                  <span className={`rounded-xl p-2 ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </Surface>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Access control</h2>
              <p className="text-sm text-slate-500">Roles available for employee and CRM workflows.</p>
            </div>
            <Link href="/users" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Users <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable
            headers={["Role", "Users", "Purpose"]}
            empty="No roles configured."
            rows={roleRows.map((role) => [
              <div key="role">
                <p className="font-medium text-slate-950">{role.label}</p>
                <p className="font-mono text-xs text-slate-500">{role.name}</p>
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
              <h2 className="font-semibold text-slate-950">System foundation</h2>
              <p className="text-sm text-slate-500">Core platform services currently enabled.</p>
            </div>
            <Database className="h-5 w-5 text-slate-400" />
          </div>
          <div className="grid gap-3">
            {[
              ["Database", "PostgreSQL"],
              ["ORM", "Drizzle"],
              ["Authentication", "Database sessions"],
              ["Password security", "Argon2id"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">CRM pipeline</h2>
              <p className="text-sm text-slate-500">Default board stages and close probabilities.</p>
            </div>
            <Link href="/crm/pipeline" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Pipeline <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {stageRows.map((stage) => (
              <div key={stage.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="font-medium text-slate-950">{stage.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{stage.probability}% probability</p>
                </div>
                <Badge tone={stage.isWon ? "green" : stage.isLost ? "red" : "blue"}>
                  {stage.isWon ? "Won" : stage.isLost ? "Lost" : labelize(stage.color)}
                </Badge>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">WhatsApp templates</h2>
              <p className="text-sm text-slate-500">Reusable CRM notification messages.</p>
            </div>
            <Link href="/crm/templates" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Templates <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {templateRows.map((template) => (
              <div key={template.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{template.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{template.key}</p>
                  </div>
                  <Badge tone="green">{template.channel}</Badge>
                </div>
              </div>
            ))}
            {!templateRows.length ? <p className="text-sm text-slate-500">No templates configured.</p> : null}
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Departments</h2>
              <p className="text-sm text-slate-500">Internal company teams.</p>
            </div>
            <Link href="/employees" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Employees <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {departmentRows.map((department) => (
              <div key={department.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium text-slate-950">{department.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {department.description || "No description"}
                </p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Security activity</h2>
              <p className="text-sm text-slate-500">Latest tracked admin and CRM events.</p>
            </div>
            <Activity className="h-5 w-5 text-slate-400" />
          </div>
          <DataTable
            headers={["Action", "Entity", "Time"]}
            empty="No audit activity yet."
            rows={auditRows.map((audit) => [
              <span key="action" className="font-medium text-slate-950">{labelize(audit.action)}</span>,
              <Badge key="entity" tone="slate">{labelize(audit.entityType)}</Badge>,
              <DateText key="time" value={audit.createdAt} />,
            ])}
          />
        </Surface>
      </section>
    </div>
  );
}
