"use client";

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-sky-600">
      <span className="flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400 [animation-delay:300ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
