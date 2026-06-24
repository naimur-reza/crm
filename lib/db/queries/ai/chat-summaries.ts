import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chatSummaries, chatMessages, users } from "@/lib/db/schema";

export async function getLatestChatSummary(groupId: string) {
  const [row] = await getDb()
    .select()
    .from(chatSummaries)
    .where(eq(chatSummaries.groupId, groupId))
    .orderBy(desc(chatSummaries.generatedAt))
    .limit(1);
  return row ?? null;
}

export async function insertChatSummary(
  groupId: string,
  data: {
    summary: string;
    messageCount: number;
    topicTags: string[];
    actionItems: string[];
    periodStart: Date;
    periodEnd: Date;
  },
) {
  const [row] = await getDb()
    .insert(chatSummaries)
    .values({ groupId, ...data })
    .returning();
  return row;
}

export async function getRecentChatMessages(groupId: string, limitCount = 50) {
  return getDb()
    .select({
      content: chatMessages.content,
      senderName: users.name,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.groupId, groupId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limitCount);
}
