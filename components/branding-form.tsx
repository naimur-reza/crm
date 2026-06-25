"use client";

import { useRef, useState } from "react";
import { Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  uploadSiteLogo,
  removeSiteLogo,
  updateSiteCompanyName,
} from "@/app/actions/settings";

function CompanyNameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("companyName", name);
    await updateSiteCompanyName(fd);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor="companyName">Company Name</Label>
      <div className="mt-1 flex gap-2">
        <input
          id="companyName"
          name="companyName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          required
        />
        <Button type="submit" size="sm">
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  return (
    <div>
      <Label>Logo</Label>
      <div className="mt-1 flex items-center gap-3">
        {logoUrl ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
            <img
              src={logoUrl}
              alt="Company logo"
              className="h-full w-full object-contain p-1"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/50">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
        <div className="flex gap-2">
          <form action={uploadSiteLogo}>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload
              </span>
              <input
                id="logo-upload"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) e.target.form?.requestSubmit(); }}
              />
            </Label>
          </form>
          {logoUrl && (
            <form action={removeSiteLogo}>
              <Button type="submit" variant="destructive" size="sm">Remove</Button>
            </form>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WebP or SVG. Max 2 MB.</p>
    </div>
  );
}

export function BrandingSection({
  companyName,
  logoUrl,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Branding</h2>
      </div>
      <CompanyNameEditor initialName={companyName} />
      <LogoUploader logoUrl={logoUrl} />
    </div>
  );
}
