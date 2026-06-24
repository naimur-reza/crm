"use client";

const AVATAR_COLORS = [
  "#3995d2", "#e74c3c", "#2ecc71", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#3498db",
  "#e91e63", "#00bcd4", "#ff5722", "#607d8b",
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";
  if (url) {
    return <img src={url} alt={name} className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-800`} />;
  }
  return (
    <span
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white dark:ring-gray-800`}
      style={{ backgroundColor: getAvatarColor(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
