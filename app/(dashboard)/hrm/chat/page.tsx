import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getUserGroups, getUsers } from "@/app/actions/chat";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "chat")) redirect("/dashboard");

  const [groups, users] = await Promise.all([
    getUserGroups(),
    getUsers(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <ChatClient currentUser={user} initialGroups={groups} allUsers={users} />
    </div>
  );
}
