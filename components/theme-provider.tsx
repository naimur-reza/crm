"use client";

import { useEffect } from "react";

function parseHue(primaryColor: string): number {
  const match = primaryColor.match(/oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 242;
}

export function ThemeProvider({
  primaryColor,
  fontFamily,
  theme,
}: {
  primaryColor: string;
  fontFamily: string;
  theme: string;
}) {
  useEffect(() => {
    const hue = parseHue(primaryColor);
    const vars: Record<string, string> = {
      "--secondary": `oklch(0.94 0.04 ${hue})`,
      "--secondary-foreground": `oklch(0.25 0.04 ${hue})`,
      "--accent": `oklch(0.94 0.04 ${hue})`,
      "--accent-foreground": `oklch(0.25 0.04 ${hue})`,
      "--chart-2": `oklch(0.5 0.12 ${hue})`,
      "--chart-3": `oklch(0.7 0.1 ${hue})`,
      "--chart-4": `oklch(0.55 0.08 ${hue})`,
      "--chart-5": `oklch(0.45 0.1 ${hue})`,
    };
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [primaryColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
