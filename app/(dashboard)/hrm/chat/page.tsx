import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-200">
          <MessageSquare className="h-8 w-8 text-sky-400" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-800">Select a conversation</p>
        <p className="mt-1 text-xs font-medium text-slate-400">Choose a chat from the sidebar to start messaging</p>
      </div>
    </div>
  );
}
