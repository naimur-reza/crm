export type Message = {
  id: string;
  type: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: Date;
  read: boolean;
  isOptimistic?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  type: "team" | "group" | "direct";
  createdAt: Date;
  memberCount: number;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  groupId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type SSEEvent =
  | { event: "new_message"; data: { groupId: string; message: Message } }
  | { event: "message_read"; data: { groupId: string; userId: string; messageId: string } }
  | { event: "typing"; data: { groupId: string; userId: string; userName: string } }
  | { event: "stop_typing"; data: { groupId: string; userId: string } }
  | { event: "presence"; data: { userId: string; status: "online" | "offline"; lastSeen: string } }
  | { event: "unread_update"; data: { groupId: string; count: number } }
  | { event: "notification"; data: Notification };
