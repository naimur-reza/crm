import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getMessages, getUsers } from "@/app/actions/chat";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "chat")) redirect("/dashboard");

  const [initialMessages, users] = await Promise.all([
    getMessages(50),
    getUsers(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Team Chat</h1>
          <p className="text-sm text-slate-500">Everyone in the team can see messages here.</p>
        </div>
      </div>
      <ChatClient currentUser={user} initialMessages={initialMessages} allUsers={users} />
    </div>
  );
}
