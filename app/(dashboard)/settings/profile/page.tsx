import { requireUser } from "@/lib/auth/session";
import { Surface } from "@/components/page-header";
import { Mail, Shield, User } from "lucide-react";
import { ProfileAvatarSection } from "./avatar";
import { ProfileNameForm } from "./name-form";
import { ProfilePasswordForm } from "./password-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="grid gap-6">

      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <ProfileAvatarSection currentUrl={user.avatarUrl} userName={user.name} />
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold text-foreground">{user.name}</h1>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Surface className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          </div>
          <ProfileNameForm currentName={user.name} />
        </Surface>

        <Surface className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
          </div>
          <ProfilePasswordForm />
        </Surface>
      </div>
    </div>
  );
}
