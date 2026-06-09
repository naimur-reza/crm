import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarClock, CircleDollarSign, MessageSquareText, Target, Users } from "lucide-react";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getCrmOverview } from "@/lib/db/queries/crm";

function invoiceTone(status: string) {
  if (status === "paid") return "green";
  if (status === "partially_paid") return "amber";
  if (status === "overdue" || status === "cancelled") return "red";
  return "blue";
}

export default async function CrmIndexPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const overview = await getCrmOverview();
  const conversionRate = overview.leads.length
    ? Math.round((overview.wonLeads.length / overview.leads.length) * 100)
    : 0;
  const nextFollowUps = overview.leads
    .filter((lead) => lead.status === "open" && lead.expectedCloseDate)
    .sort((first, second) =>
      String(first.expectedCloseDate).localeCompare(String(second.expectedCloseDate)),
    )
    .slice(0, 5);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="CRM overview"
        description="A command center for pipeline health, client movement, invoices, and communication follow-up."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Estimated pipeline",
            value: <Money cents={overview.openPipelineCents} />,
            helper: `${overview.openLeads.length} open leads`,
            icon: Target,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Won estimate",
            value: <Money cents={overview.wonRevenueCents} />,
            helper: `${conversionRate}% conversion`,
            icon: CircleDollarSign,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Receivables",
            value: <Money cents={overview.invoiceBalanceCents} />,
            helper: `${overview.unpaidInvoices.length} unpaid invoices`,
            icon: CalendarClock,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "Active clients",
            value: overview.activeClients.length,
            helper: "Client accounts live",
            icon: Users,
            tone: "bg-violet-50 text-violet-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Surface key={card.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
                </div>
                <span className={`rounded-xl p-2 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Surface>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Priority follow-ups</h2>
              <p className="text-sm text-slate-500">Open leads sorted by expected close date.</p>
            </div>
            <Link href="/crm/leads" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Leads <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {nextFollowUps.map((lead) => (
              <Link
                key={lead.id}
                href={`/crm/leads/${lead.id}`}
                className="grid gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#3995d2] md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{lead.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {lead.companyName || "No company"} · {lead.stageName || "No stage"}
                  </p>
                </div>
                <div className="text-sm text-slate-600">
                  <DateText value={lead.expectedCloseDate} />
                </div>
              </Link>
            ))}
            {!nextFollowUps.length ? <p className="text-sm text-slate-500">No upcoming follow-ups.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Invoice watch</h2>
              <p className="text-sm text-slate-500">Open invoice balances needing attention.</p>
            </div>
            <Link href="/crm/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-[#3995d2]">
              Invoices <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {overview.unpaidInvoices.slice(0, 5).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/crm/invoices/${invoice.id}`}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-[#3995d2]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {invoice.clientName || invoice.leadTitle || "Unassigned"}
                    </p>
                  </div>
                  <Badge tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Balance</span>
                  <Money cents={Math.max(0, invoice.totalCents - invoice.paidCents)} />
                </div>
              </Link>
            ))}
            {!overview.unpaidInvoices.length ? <p className="text-sm text-slate-500">No unpaid invoices.</p> : null}
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Recent CRM activity</h2>
              <p className="text-sm text-slate-500">Latest timeline movement across leads.</p>
            </div>
            <MessageSquareText className="h-5 w-5 text-slate-400" />
          </div>
          <div className="grid gap-4">
            {overview.recentActivities.map((activity) => (
              <Link key={activity.id} href={`/crm/leads/${activity.leadId}`} className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-[#3995d2]" />
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-950">{activity.leadTitle || "Lead activity"}</p>
                    <Badge tone={activity.type === "whatsapp" ? "green" : "blue"}>{activity.type}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{activity.summary}</p>
                </div>
              </Link>
            ))}
            {!overview.recentActivities.length ? <p className="text-sm text-slate-500">No CRM activity yet.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">WhatsApp activity</h2>
          <p className="text-sm text-slate-500">Recently generated client notifications.</p>
          <div className="mt-5 grid max-h-80 gap-3 overflow-y-auto pr-1">
            {overview.recentNotifications.map((notification) => (
              <a
                key={notification.id}
                href={notification.waLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="block h-24 overflow-hidden rounded-xl border border-slate-200 p-4 text-sm transition hover:border-[#3995d2]"
              >
                <p className="truncate font-medium text-slate-950">
                  {notification.recipientName || notification.recipientPhone || "Recipient"}
                </p>
                <p className="mt-1 line-clamp-2 text-slate-500">{notification.message}</p>
              </a>
            ))}
            {!overview.recentNotifications.length ? <p className="text-sm text-slate-500">No WhatsApp activity yet.</p> : null}
          </div>
        </Surface>
      </section>
    </div>
  );
}
