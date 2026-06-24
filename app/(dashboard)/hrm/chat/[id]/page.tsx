import { getMessages } from "@/app/actions/chat";
import { ChatView } from "./chat-view";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  const messages = await getMessages(id, 50);

  return <ChatView groupId={id} initialMessages={messages} />;
}
