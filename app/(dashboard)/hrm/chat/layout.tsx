import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getUserGroups, getUsers } from "@/app/actions/chat";
import { ChatShell } from "./chat-shell";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!canAccess(user, "chat")) redirect("/dashboard");

  const [groups, users] = await Promise.all([
    getUserGroups(),
    getUsers(),
  ]);

  return (
    <ChatShell
      initialGroups={groups}
      allUsers={users}
      currentUser={user}
    >
      {children}
    </ChatShell>
  );
}
