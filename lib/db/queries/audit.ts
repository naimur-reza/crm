import "server-only";

import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  await getDb().insert(auditLogs).values({
    actorUserId,
    action,
    entityType,
    entityId,
    metadata,
  });
}
