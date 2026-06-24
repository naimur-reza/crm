"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { uploadAvatar, removeAvatar } from "@/app/actions/profile";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileAvatarSection({
  currentUrl,
  userName,
}: {
  currentUrl: string | null;
  userName: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      setTimeout(() => formRef.current?.requestSubmit(), 100);
    }
  }

  const showUrl = preview || currentUrl;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        {showUrl ? (
          <img
            src={showUrl}
            alt={userName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#60b0e0] text-2xl font-bold text-white ring-2 ring-border">
            {getInitials(userName)}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form ref={formRef} action={uploadAvatar} className="relative">
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Camera className="h-4 w-4" />
            Change Photo
          </button>
        </form>
        {currentUrl && (
          <form action={removeAvatar}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-card px-3 text-sm font-medium text-rose-600 dark:text-rose-400 transition hover:border-rose-300 dark:hover:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
