"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { chatGroupMembers, chatGroups, chatMessageReads, chatMessages, notifications, users } from "@/lib/db/schema";

const sendMessageSchema = z.string().min(1).max(2000);

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const content = formData.get("content");
  const groupId = formData.get("groupId");

  const parsed = sendMessageSchema.safeParse(content);
  if (!parsed.success) throw new Error("Message must be between 1 and 2000 characters.");
  if (typeof groupId !== "string" || !groupId) throw new Error("Group ID required.");

  const [membership] = await getDb()
    .select({ id: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership) throw new Error("You are not a member of this group.");

  const [msg] = await getDb()
    .insert(chatMessages)
    .values({ senderId: user.id, groupId, content: parsed.data })
    .returning({ id: chatMessages.id });

  const [group] = await getDb()
    .select({ type: chatGroups.type, name: chatGroups.name })
    .from(chatGroups)
    .where(eq(chatGroups.id, groupId))
    .limit(1);

  const allMemberIds = await getDb()
    .select({ userId: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.groupId, groupId));

  const memberIds = allMemberIds.map((m) => m.userId).filter((id) => id !== user.id);

  const mentionRegex = /@(\w[\w\s]*\w)/g;
  const mentionedNames = [...parsed.data.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());

  const allUsers = memberIds.length > 0
    ? await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, memberIds))
    : [];

  const notifiedIds = new Set<string>();

  for (const member of allUsers) {
    if (notifiedIds.has(member.id)) continue;
    const isMention = mentionedNames.length > 0 && mentionedNames.some((n) => member.name.toLowerCase().includes(n));

    let notifType = group?.type === "direct" ? "dm" : "group_message";
    if (isMention) notifType = "mention";

    await getDb().insert(notifications).values({
      userId: member.id,
      type: notifType,
      title: isMention ? `You were mentioned` : group?.type === "direct" ? "New message" : `New message in ${group?.name}`,
      body: parsed.data.length > 120 ? parsed.data.slice(0, 120) + "…" : parsed.data,
      groupId,
      actorUserId: user.id,
    });
    notifiedIds.add(member.id);
  }

  return { id: msg.id };
}

export async function getMessages(groupId: string, limit = 50) {
  const user = await requireUser();

  const [membership] = await getDb()
    .select({ id: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership) throw new Error("You are not a member of this group.");

  const rows = await getDb()
    .select({
      id: chatMessages.id,
      type: chatMessages.type,
      content: chatMessages.content,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderAvatar: users.avatarUrl,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.groupId, groupId))
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const messageIds = rows.map((r) => r.id);

  const reads = messageIds.length > 0
    ? await getDb()
        .select({
          messageId: chatMessageReads.messageId,
          userId: chatMessageReads.userId,
        })
        .from(chatMessageReads)
        .where(and(inArray(chatMessageReads.messageId, messageIds), eq(chatMessageReads.userId, user.id)))
    : [];

  const readSet = new Set(reads.map((r) => r.messageId));

  return rows.reverse().map((msg) => ({
    id: msg.id,
    type: msg.type,
    content: msg.content,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    createdAt: msg.createdAt,
    read: readSet.has(msg.id),
  }));
}

export async function markMessagesRead(groupId: string) {
  const user = await requireUser();

  const unreadMessages = await getDb()
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .leftJoin(chatMessageReads, and(
      eq(chatMessageReads.messageId, chatMessages.id),
      eq(chatMessageReads.userId, user.id),
    ))
    .where(and(
      eq(chatMessages.groupId, groupId),
      eq(chatMessages.type, "user"),
      sql`${chatMessages.senderId} != ${user.id}::uuid`,
      sql`${chatMessageReads.messageId} is null`,
    ));

  if (unreadMessages.length === 0) return;

  await getDb().insert(chatMessageReads).values(
    unreadMessages.map((m) => ({ messageId: m.id, userId: user.id })),
  ).onConflictDoNothing();
}

export async function getGroupUnreadCounts() {
  const user = await requireUser();

  const groups = await getDb()
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, user.id));

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.groupId);

  const counts = await getDb()
    .select({
      groupId: chatMessages.groupId,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(chatMessages)
    .leftJoin(chatMessageReads, and(
      eq(chatMessageReads.messageId, chatMessages.id),
      eq(chatMessageReads.userId, user.id),
    ))
    .where(and(
      inArray(chatMessages.groupId, groupIds),
      eq(chatMessages.type, "user"),
      sql`${chatMessages.senderId} != ${user.id}::uuid AND ${chatMessages.groupId} IS NOT NULL`,
      sql`${chatMessageReads.messageId} is null`,
    ))
    .groupBy(chatMessages.groupId);

  return counts.filter((c) => c.groupId).map((c) => ({ groupId: c.groupId!, count: c.count }));
}

export async function getNotifications(limit = 20) {
  const user = await requireUser();

  const rows = await getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      groupId: notifications.groupId,
      actorUserId: notifications.actorUserId,
      actorName: users.name,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorUserId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows;
}

export async function getUnreadNotificationCount() {
  const user = await requireUser();

  const [row] = await getDb()
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), sql`${notifications.readAt} is null`));

  return row.count;
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;

  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
}

export async function markAllNotificationsRead() {
  const user = await requireUser();

  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), sql`${notifications.readAt} is null`));
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

  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(and(eq(users.status, "active"), sql`${users.id} <> ${user.id}`))
    .orderBy(users.name);

  return rows;
}

export async function getUserGroups() {
  const user = await requireUser();

  const memberGroupIds = await getDb()
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, user.id));

  if (memberGroupIds.length === 0) return [];

  const groupIds = memberGroupIds.map((r) => r.groupId);

  const [groupRows, memberCounts, lastMessages] = await Promise.all([
    getDb().select().from(chatGroups).where(inArray(chatGroups.id, groupIds)),
    getDb()
      .select({
        groupId: chatGroupMembers.groupId,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(chatGroupMembers)
      .where(inArray(chatGroupMembers.groupId, groupIds))
      .groupBy(chatGroupMembers.groupId),
    getDb()
      .select({
        groupId: chatMessages.groupId,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(and(inArray(chatMessages.groupId, groupIds), sql`${chatMessages.groupId} is not null`))
      .orderBy(desc(chatMessages.createdAt)),
  ]);

  const lastMessageByGroup = new Map<string, typeof lastMessages[0]>();
  for (const msg of lastMessages) {
    if (msg.groupId && !lastMessageByGroup.has(msg.groupId)) {
      lastMessageByGroup.set(msg.groupId, msg);
    }
  }

  const countByGroup = new Map(memberCounts.map((r) => [r.groupId, r.count]));

  const rows = groupRows.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    type: g.type as "team" | "group" | "direct",
    createdAt: g.createdAt,
    memberCount: countByGroup.get(g.id) ?? 0,
    lastMessageContent: lastMessageByGroup.get(g.id)?.content ?? null,
    lastMessageAt: lastMessageByGroup.get(g.id)?.createdAt.toISOString() ?? null,
  }));

  rows.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  return rows;
}

export async function getGroupMembers(groupId: string) {
  const user = await requireUser();

  const [membership] = await getDb()
    .select({ id: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership) throw new Error("You are not a member of this group.");

  const rows = await getDb()
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: chatGroupMembers.role,
      joinedAt: chatGroupMembers.joinedAt,
    })
    .from(chatGroupMembers)
    .innerJoin(users, eq(chatGroupMembers.userId, users.id))
    .where(eq(chatGroupMembers.groupId, groupId))
    .orderBy(users.name);

  return rows;
}

export async function createChatGroup(formData: FormData) {
  const user = await requireUser();
  const name = formData.get("name");
  const description = formData.get("description");
  const memberIdsRaw = formData.getAll("memberIds");

  if (typeof name !== "string" || name.length < 1 || name.length > 100) {
    throw new Error("Group name must be 1–100 characters.");
  }

  const memberIds = memberIdsRaw.filter((id): id is string => typeof id === "string" && id.length > 0);

  const group = await getDb()
    .insert(chatGroups)
    .values({ name, description: typeof description === "string" ? description : null, createdBy: user.id, type: "group" })
    .returning({ id: chatGroups.id });

  const groupId = group[0].id;

  const allMemberIds = [...new Set([user.id, ...memberIds])];

  await getDb().insert(chatGroupMembers).values(
    allMemberIds.map((uid) => ({ groupId, userId: uid, role: uid === user.id ? "admin" : "member" })),
  );

  if (memberIds.length > 0) {
    const addedUsers = await getDb()
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, memberIds));

    const names = addedUsers.map((u) => u.name);
    await getDb().insert(chatMessages).values({
      senderId: user.id,
      groupId,
      type: "system",
      content: `${user.name} created the group and added ${names.join(", ")}.`,
    });
  }

  return { groupId };
}

export async function getOrCreateDirectMessageGroup(otherUserId: string) {
  const user = await requireUser();

  const existing = await getDb()
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, user.id));

  const groupIds = existing.map((r) => r.groupId);
  if (groupIds.length > 0) {
    const mutual = await getDb()
      .select({ groupId: chatGroupMembers.groupId })
      .from(chatGroupMembers)
      .where(and(eq(chatGroupMembers.userId, otherUserId), inArray(chatGroupMembers.groupId, groupIds)))
      .innerJoin(chatGroups, and(eq(chatGroups.id, chatGroupMembers.groupId), eq(chatGroups.type, "direct")))
      .limit(1);

    if (mutual.length > 0) return { groupId: mutual[0].groupId };
  }

  const otherUser = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);
  if (!otherUser.length) throw new Error("User not found.");

  const group = await getDb()
    .insert(chatGroups)
    .values({ name: otherUser[0].name, type: "direct", createdBy: user.id })
    .returning({ id: chatGroups.id });

  const groupId = group[0].id;

  await getDb().insert(chatGroupMembers).values([
    { groupId, userId: user.id, role: "admin" },
    { groupId, userId: otherUserId, role: "member" },
  ]);

  return { groupId };
}

export async function addGroupMembers(formData: FormData) {
  const user = await requireUser();
  const groupId = formData.get("groupId");
  const memberIds = formData.getAll("memberIds").filter((id): id is string => typeof id === "string" && id.length > 0);

  if (typeof groupId !== "string" || !groupId) throw new Error("Group ID required.");
  if (memberIds.length === 0) throw new Error("No members selected.");

  const [membership] = await getDb()
    .select({ role: chatGroupMembers.role })
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership || membership.role !== "admin") throw new Error("Only group admins can add members.");

  const existing = await getDb()
    .select({ userId: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.groupId, groupId));

  const existingIds = new Set(existing.map((r) => r.userId));
  const newIds = memberIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return { added: 0 };

  await getDb().insert(chatGroupMembers).values(
    newIds.map((uid) => ({ groupId, userId: uid, role: "member" })),
  );

  const addedUsers = await getDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, newIds));

  const names = addedUsers.map((u) => u.name);
  await getDb().insert(chatMessages).values({
    senderId: user.id,
    groupId,
    type: "system",
    content: `${user.name} added ${names.join(", ")} to the group.`,
  });

  return { added: newIds.length };
}

export async function removeGroupMember(formData: FormData) {
  const user = await requireUser();
  const groupId = formData.get("groupId");
  const targetUserId = formData.get("userId");

  if (typeof groupId !== "string" || typeof targetUserId !== "string") {
    throw new Error("Invalid parameters.");
  }

  const [membership] = await getDb()
    .select({ role: chatGroupMembers.role })
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership || membership.role !== "admin") throw new Error("Only admins can remove members.");

  const [target] = await getDb()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  await getDb()
    .delete(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, targetUserId)));

  if (target) {
    await getDb().insert(chatMessages).values({
      senderId: user.id,
      groupId,
      type: "system",
      content: `${target.name} was removed from the group.`,
    });
  }
}

export async function leaveGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = formData.get("groupId");

  if (typeof groupId !== "string") throw new Error("Invalid group ID.");

  await getDb()
    .delete(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, user.id)));
}

export async function deleteChatGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = formData.get("groupId");

  if (typeof groupId !== "string") throw new Error("Invalid group ID.");

  const [group] = await getDb()
    .select({ createdBy: chatGroups.createdBy, type: chatGroups.type })
    .from(chatGroups)
    .where(eq(chatGroups.id, groupId))
    .limit(1);
  if (!group) throw new Error("Group not found.");
  if (group.type === "team") throw new Error("Cannot delete the main team chat.");
  if (group.createdBy !== user.id) throw new Error("Only the group creator can delete this group.");

  await getDb().delete(chatGroups).where(eq(chatGroups.id, groupId));
}
