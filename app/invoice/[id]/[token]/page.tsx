import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { getInvoiceDocumentData } from "@/lib/invoices/pdf";
import { buildInvoicePdfUrl, verifyInvoicePdfToken } from "@/lib/invoices/pdf-token";

function formatTk(cents: number | null | undefined) {
  return `TK ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100)}`;
}

async function getShareData(id: string, token: string) {
  if (!verifyInvoicePdfToken(id, token)) return null;
  return getInvoiceDocumentData(id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}): Promise<Metadata> {
  const { id, token } = await params;
  const data = await getShareData(id, token);
  if (!data) return {};

  const title = `Invoice ${data.invoice.invoiceNumber}`;
  const description = `${data.accountName} - Total ${formatTk(data.invoice.totalCents)}, Due ${formatTk(data.balanceCents)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = await params;
  const data = await getShareData(id, token);
  if (!data) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pdfUrl = buildInvoicePdfUrl(appUrl, id);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3995d2] text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Invoice</p>
            <h1 className="mt-1 text-2xl font-semibold">{data.invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-slate-600">{data.accountName}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Total</span>
            <strong>{formatTk(data.invoice.totalCents)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Paid</span>
            <strong>{formatTk(data.invoice.paidCents)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Due</span>
            <strong className={data.balanceCents > 0 ? "text-rose-600" : "text-emerald-600"}>
              {formatTk(data.balanceCents)}
            </strong>
          </div>
        </div>

        <Link
          href={pdfUrl}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#3995d2] px-4 text-sm font-semibold text-white transition hover:bg-[#2f80bd]"
        >
          <Download className="h-4 w-4" />
          Open PDF invoice
        </Link>
      </section>
    </main>
  );
}
