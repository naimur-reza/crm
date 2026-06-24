import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { chatGroupMembers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { addClient, removeClient } from "@/lib/chat/sse-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();

  const groupIdsParam = req.nextUrl.searchParams.get("groupIds");
  if (!groupIdsParam) {
    return new Response("groupIds required", { status: 400 });
  }

  const requestedIds = groupIdsParam.split(",").filter(Boolean);
  if (requestedIds.length === 0) {
    return new Response("groupIds required", { status: 400 });
  }

  const memberships = await getDb()
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(and(
      inArray(chatGroupMembers.groupId, requestedIds),
      eq(chatGroupMembers.userId, user.id),
    ));

  const authorizedIds = memberships.map((m) => m.groupId).filter(Boolean) as string[];
  if (authorizedIds.length === 0) {
    return new Response("Forbidden", { status: 403 });
  }

  let clientId: string | null = null;

  const stream = new ReadableStream({
    start(controller) {
      clientId = crypto.randomUUID();
      addClient(clientId, controller, authorizedIds);

      controller.enqueue(new TextEncoder().encode(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(":\n\n"));
        } catch {
          clearInterval(heartbeat);
          if (clientId) removeClient(clientId);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (clientId) removeClient(clientId);
      });
    },
    cancel() {
      if (clientId) removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
