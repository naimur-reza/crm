import { NextResponse } from "next/server";
import { canAccess } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { generateDashboardPdf } from "@/lib/reports/pdf-dashboard";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccess(user, "reports")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { bytes, filename } = await generateDashboardPdf();

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
