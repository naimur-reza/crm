import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return Response.json({
      ok: true,
      service: "company-productivity-tools",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { ok: false, service: "company-productivity-tools", error: "Database unreachable" },
      { status: 503 },
    );
  }
}
