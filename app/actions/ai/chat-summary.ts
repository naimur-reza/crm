"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getAiClient, getAiModel } from "@/lib/ai/client";
import { chatSummaryPrompt } from "@/lib/ai/prompts";
import { getRecentChatMessages, insertChatSummary, getLatestChatSummary } from "@/lib/db/queries/ai/chat-summaries";

export async function summarizeChat(groupId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const messages = await getRecentChatMessages(groupId, 50);
  if (messages.length === 0) throw new Error("No messages to summarize");

  const formattedMessages = messages
    .reverse()
    .map((m) => ({ sender: m.senderName ?? "Unknown", content: m.content }));

  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: getAiModel(),
    messages: [
      {
        role: "system",
        content:
          "You are a chat summarization AI. Always respond with valid JSON only.",
      },
      { role: "user", content: chatSummaryPrompt(formattedMessages) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");

  const periodEnd = new Date();
  const periodStart = new Date(messages[0]?.createdAt ?? periodEnd);

  await insertChatSummary(groupId, {
    summary: result.summary ?? "",
    messageCount: messages.length,
    topicTags: result.keyTopics ?? [],
    actionItems: result.actionItems ?? [],
    periodStart,
    periodEnd,
  });

  revalidatePath("/hrm/chat");
  return result;
}

export async function getLatestChatSummaryAction(groupId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getLatestChatSummary(groupId);
}
