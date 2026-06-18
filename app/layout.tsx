import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Plus_Jakarta_Sans,
  DM_Sans,
  Outfit,
  Space_Grotesk,
} from "next/font/google";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteSettings } from "@/app/actions/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  inter.variable,
  plusJakartaSans.variable,
  dmSans.variable,
  outfit.variable,
  spaceGrotesk.variable,
].join(" ");

const FONT_MAP: Record<string, string> = {
  Geist: "var(--font-geist-sans)",
  Inter: "var(--font-inter)",
  "Plus Jakarta Sans": "var(--font-plus-jakarta-sans)",
  "DM Sans": "var(--font-dm-sans)",
  Outfit: "var(--font-outfit)",
  "Space Grotesk": "var(--font-space-grotesk)",
  Satoshi: "var(--font-geist-sans)",
  "system-ui": "system-ui, ui-sans-serif, sans-serif",
};

export const metadata: Metadata = {
  title: "Company Productivity Tools",
  description: "Internal CRM, attendance, employee, task, and user management.",
};

function computeThemeVars(primaryColor: string) {
  const match = primaryColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  const l = match ? parseFloat(match[1]) : 0.62;
  const c = match ? parseFloat(match[2]) : 0.14;
  const h = match ? parseFloat(match[3]) : 242;

  return {
    "--primary": primaryColor,
    "--primary-foreground": "oklch(0.985 0 0)",
    "--secondary": `oklch(0.94 0.04 ${h})`,
    "--secondary-foreground": `oklch(0.25 0.04 ${h})`,
    "--accent": `oklch(0.94 0.04 ${h})`,
    "--accent-foreground": `oklch(0.25 0.04 ${h})`,
    "--ring": primaryColor,
    "--chart-1": primaryColor,
    "--chart-2": `oklch(0.5 0.12 ${h})`,
    "--chart-3": `oklch(0.7 0.1 ${h})`,
    "--chart-4": `oklch(0.55 0.08 ${h})`,
    "--chart-5": `oklch(0.45 0.1 ${h})`,
    "--sidebar-primary": primaryColor,
    "--sidebar-ring": primaryColor,
  } as Record<string, string>;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let primaryColor = "oklch(0.62 0.14 242)";
  let fontFamily = "Geist";
  let theme = "light";

  try {
    const settings = await getSiteSettings();
    primaryColor = settings.primaryColor ?? primaryColor;
    fontFamily = settings.fontFamily ?? fontFamily;
    theme = settings.theme ?? theme;
  } catch {}

  const themeVars = computeThemeVars(primaryColor);
  const fontVar = FONT_MAP[fontFamily] || "var(--font-geist-sans)";
  const htmlClass = [fontVariables, "h-full antialiased", theme === "dark" ? "dark" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang="en"
      className={htmlClass}
      style={{ ...themeVars, fontFamily: fontVar } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeProvider primaryColor={primaryColor} fontFamily={fontFamily} theme={theme} />
        <ToastProvider />
      </body>
    </html>
  );
}
