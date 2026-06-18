"use client";

import { useActionState, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import {
  updateSiteSettings,
  uploadSiteLogo,
  removeSiteLogo,
} from "@/app/actions/settings";

const PRESETS = [
  { name: "Blue", value: "oklch(0.62 0.14 242)" },
  { name: "Sky", value: "oklch(0.65 0.14 210)" },
  { name: "Indigo", value: "oklch(0.58 0.18 275)" },
  { name: "Violet", value: "oklch(0.56 0.18 295)" },
  { name: "Green", value: "oklch(0.62 0.15 160)" },
  { name: "Teal", value: "oklch(0.6 0.13 185)" },
  { name: "Orange", value: "oklch(0.65 0.15 45)" },
  { name: "Rose", value: "oklch(0.6 0.16 10)" },
];

const FONTS = [
  { name: "Geist", value: "Geist" },
  { name: "Inter", value: "Inter" },
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { name: "DM Sans", value: "DM Sans" },
  { name: "Outfit", value: "Outfit" },
  { name: "Space Grotesk", value: "Space Grotesk" },
  { name: "Satoshi", value: "Satoshi" },
  { name: "System UI", value: "system-ui" },
];

function LogoUploader({
  logoUrl,
}: {
  logoUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-3">
      <Label>Company Logo</Label>
      {logoUrl ? (
        <div className="flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-12 w-auto rounded-lg border object-contain"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No logo uploaded. Default logo will be used.
        </p>
      )}
      <div className="flex gap-2">
        <form action={uploadSiteLogo}>
          <Label htmlFor="logo-upload" className="cursor-pointer">
            <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent">
              Upload Logo
            </span>
            <input
              id="logo-upload"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) e.target.form?.requestSubmit();
              }}
            />
          </Label>
        </form>
        {logoUrl && (
          <form action={removeSiteLogo}>
            <Button type="submit" variant="destructive" size="sm">
              Remove Logo
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function BrandingForm({
  companyName: initialName,
  primaryColor: initialColor,
  fontFamily: initialFont,
  theme: initialTheme,
  logoUrl: initialLogo,
}: {
  companyName: string;
  primaryColor: string;
  fontFamily: string;
  theme: string;
  logoUrl: string | null;
}) {
  const [companyName, setCompanyName] = useState(initialName);
  const [fontFamily, setFontFamily] = useState(initialFont);
  const [theme, setTheme] = useState(initialTheme);
  const [primaryColor, setPrimaryColor] = useState(initialColor);

  type FormState = { ok: boolean | null; error: string | null };
  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updateSiteSettings(formData);
        return { ok: true, error: null };
      } catch (e: any) {
        return { ok: false, error: e.message ?? "An error occurred" };
      }
    },
    { ok: null, error: null } satisfies FormState,
  );

  return (
    <div className="grid gap-8">
      <form action={formAction} className="grid gap-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
          <label htmlFor="companyName" className="text-sm leading-none font-medium select-none">Company Name</label>
          <input
            id="companyName"
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company"
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
          />
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Primary Color</Label>
          <input type="hidden" name="primaryColor" value={primaryColor} />
          <div className="flex flex-wrap gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                onClick={() => setPrimaryColor(preset.value)}
                className={`h-10 w-10 rounded-full border-2 border-white shadow-sm transition hover:scale-110 ${
                  primaryColor === preset.value ? "ring-2 ring-offset-2 ring-primary" : ""
                }`}
                style={{ background: preset.value }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 max-w-xs">
          <Label htmlFor="fontFamily">Font</Label>
          <select
            id="fontFamily"
            name="fontFamily"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 max-w-xs">
          <Label htmlFor="theme">Theme</Label>
          <select
            id="theme"
            name="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <SubmitButton pendingLabel="Saving...">Save Settings</SubmitButton>
          {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
          {state?.ok === true && !pending && <p className="mt-2 text-sm text-green-600">Settings saved.</p>}
        </div>
      </form>

      <hr className="border-border" />

      <LogoUploader logoUrl={initialLogo} />
    </div>
  );
}
