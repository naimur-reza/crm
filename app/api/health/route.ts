export async function GET() {
  return Response.json({
    ok: true,
    service: "company-productivity-tools",
    timestamp: new Date().toISOString(),
  });
}
