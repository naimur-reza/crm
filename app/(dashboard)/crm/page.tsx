import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarClock, CircleDollarSign, Target, Users } from "lucide-react";
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
  if (!canAccess(user, "crm")) redirect("/dashboard");

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
            tone: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
          },
          {
            label: "Won estimate",
            value: <Money cents={overview.wonRevenueCents} />,
            icon: CircleDollarSign,
            tone: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Receivables",
            value: <Money cents={overview.invoiceBalanceCents} />,
            icon: CalendarClock,
            tone: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
          },
          {
            label: "Active clients",
            value: overview.activeClients.length,
            icon: Users,
            tone: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group relative min-h-28 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-2xl font-bold leading-none text-slate-800">{card.value}</p>
                </div>
                <span className={`rounded-xl p-2 ring-1 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Follow-ups</p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">Priority follow-ups</h2>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Open leads sorted by expected close date.</p>
              <Link href="/crm/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
                Leads <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {nextFollowUps.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  className="grid gap-3 rounded-xl border border-sky-100 p-4 transition hover:border-sky-200 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">{lead.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {lead.companyName || "No company"} · {lead.stageName || "No stage"}
                      {lead.valueCents ? ` · ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lead.valueCents / 100)}` : ""}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    <DateText value={lead.expectedCloseDate} />
                  </div>
                </Link>
              ))}
              {!nextFollowUps.length ? <p className="text-sm text-slate-400">No upcoming follow-ups.</p> : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">Invoice watch</h2>
              <p className="text-sm text-slate-400">Open invoice balances needing attention.</p>
            </div>
            <Link href="/crm/invoices" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
              Invoices <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {overview.unpaidInvoices.slice(0, 5).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/crm/invoices/${invoice.id}`}
                className="rounded-xl border border-sky-100 p-4 transition hover:border-sky-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {invoice.clientName || invoice.leadTitle || "Unassigned"}
                    </p>
                  </div>
                  <Badge tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Balance</span>
                  <Money cents={Math.max(0, invoice.totalCents - invoice.paidCents)} />
                </div>
              </Link>
            ))}
            {!overview.unpaidInvoices.length ? <p className="text-sm text-slate-400">No unpaid invoices.</p> : null}
          </div>
        </div>
      </section>

    </div>
  );
}
