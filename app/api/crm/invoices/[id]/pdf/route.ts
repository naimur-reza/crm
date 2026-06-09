import { NextResponse } from "next/server";
import { canAccess } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { buildInvoicePdfUrl, verifyInvoicePdfToken } from "@/lib/invoices/pdf-token";
import { generateInvoicePdf } from "@/lib/invoices/pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const hasValidToken = verifyInvoicePdfToken(id, token);

  if (!hasValidToken) {
    const user = await getCurrentUser();
    if (!user || !canAccess(user.roles, "crm")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const origin = `${url.protocol}//${url.host}`;
  const pdfUrl = buildInvoicePdfUrl(origin, id);
  const { bytes, fileName } = await generateInvoicePdf(id, pdfUrl);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
