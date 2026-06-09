"use server";

import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";

const sendMessageSchema = z.string().min(1).max(2000);

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const content = formData.get("content");

  const parsed = sendMessageSchema.safeParse(content);
  if (!parsed.success) throw new Error("Message must be between 1 and 2000 characters.");

  await getDb().insert(chatMessages).values({
    senderId: user.id,
    content: parsed.data,
  });
}

export async function getMessages(limit = 50) {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const rows = await getDb()
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      senderId: chatMessages.senderId,
      senderName: users.name,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  return rows.reverse();
}

export async function deleteMessage(formData: FormData) {
  const user = await requireUser();
  const messageId = formData.get("messageId");

  if (typeof messageId !== "string" || !messageId) {
    throw new Error("Invalid message ID.");
  }

  const [msg] = await getDb()
    .select({ senderId: chatMessages.senderId })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (!msg) throw new Error("Message not found.");
  if (msg.senderId !== user.id) throw new Error("You can only unsend your own messages.");

  await getDb().delete(chatMessages).where(eq(chatMessages.id, messageId));
}

export async function getUsers() {
  const user = await requireUser();
  if (!user) throw new Error("Unauthorized");

  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(users.name);

  return rows;
}
