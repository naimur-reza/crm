import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarClock, CircleDollarSign, Target, Users } from "lucide-react";
import { Surface } from "@/components/page-header";
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
  const nextFollowUps = overview.leads
    .filter((lead) => lead.status === "open" && lead.expectedCloseDate)
    .sort((first, second) =>
      String(first.expectedCloseDate).localeCompare(String(second.expectedCloseDate)),
    )
    .slice(0, 5);

  return (
    <div className="grid gap-6">

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Estimated pipeline",
            value: <Money cents={overview.openPipelineCents} />,
            icon: Target,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Won estimate",
            value: <Money cents={overview.wonRevenueCents} />,
            icon: CircleDollarSign,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Receivables",
            value: <Money cents={overview.invoiceBalanceCents} />,
            icon: CalendarClock,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "Active clients",
            value: overview.activeClients.length,
            icon: Users,
            tone: "bg-violet-50 text-violet-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Surface key={card.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
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
              <h2 className="font-semibold text-foreground">Priority follow-ups</h2>
              <p className="text-sm text-muted-foreground">Open leads sorted by expected close date.</p>
            </div>
            <Link href="/crm/leads" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Leads <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {nextFollowUps.map((lead) => (
              <Link
                key={lead.id}
                href={`/crm/leads/${lead.id}`}
                className="grid gap-3 rounded-xl border border-border p-4 transition hover:border-primary md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{lead.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.companyName || "No company"} · {lead.stageName || "No stage"}
                    {lead.valueCents ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lead.valueCents / 100)}` : ""}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <DateText value={lead.expectedCloseDate} />
                </div>
              </Link>
            ))}
            {!nextFollowUps.length ? <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Invoice watch</h2>
              <p className="text-sm text-muted-foreground">Open invoice balances needing attention.</p>
            </div>
            <Link href="/crm/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Invoices <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {overview.unpaidInvoices.slice(0, 5).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/crm/invoices/${invoice.id}`}
                className="rounded-xl border border-border p-4 transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-foreground">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invoice.clientName || invoice.leadTitle || "Unassigned"}
                    </p>
                  </div>
                  <Badge tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <Money cents={Math.max(0, invoice.totalCents - invoice.paidCents)} />
                </div>
              </Link>
            ))}
            {!overview.unpaidInvoices.length ? <p className="text-sm text-muted-foreground">No unpaid invoices.</p> : null}
          </div>
        </Surface>
      </section>

    </div>
  );
}
