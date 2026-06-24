import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/app/actions/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  let companyName = "Company";
  let logoUrl: string | null = null;
  try {
    const settings = await getSiteSettings();
    companyName = settings.companyName || "Company";
    logoUrl = settings.logoUrl;
  } catch {}

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)]">
      <svg
        viewBox="0 0 1440 900"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-fill-2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0" />
            <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d="M0 480 C180 420 240 360 420 380 C600 400 660 440 840 420 C1020 400 1080 340 1260 360 C1350 370 1400 400 1440 420 L1440 900 L0 900 Z"
          fill="url(#wave-fill)"
        />
        <path
          d="M0 540 C200 580 320 500 500 520 C680 540 740 600 920 580 C1100 560 1160 500 1340 520 C1400 525 1430 540 1440 545 L1440 900 L0 900 Z"
          fill="url(#wave-fill-2)"
        />
        <path
          d="M0 380 C160 340 280 400 460 380 C640 360 700 320 880 340 C1060 360 1120 410 1300 390 C1380 380 1420 370 1440 365 L1440 900 L0 900 Z"
          fill="url(#wave-fill)"
          opacity="0.5"
        />
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(147,197,253,0.10),transparent_50%)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col lg:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-8 sm:py-16 lg:items-start lg:text-left">
          <div className="max-w-sm mx-auto md:mx-0">
            {logoUrl ? (
              <div className="bg-white p-2 rounded-2xl shadow-[0_8px_32px_rgba(31,92,132,0.18)] ring-1 ring-white/20 mb-6 flex items-center justify-center h-28 w-40">
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="size-full object-contain"
                />
              </div>
            ) : (
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 shadow-[0_8px_32px_rgba(31,92,132,0.18)] ring-1 ring-white/20 lg:h-28 lg:w-28">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <h1 className="bg-gradient-to-br from-slate-800 via-slate-700 to-sky-700 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl lg:text-5xl">
              {companyName}
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-500">
              Streamline your workforce with intelligent attendance tracking,
              team management, and comprehensive reporting tools.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-16">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-white/40 bg-white/15 p-6 shadow-[0_14px_40px_rgba(31,92,132,0.10)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800">
                  Welcome back
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sign in to access your dashboard
                </p>
              </div>
              <LoginForm />
            </div>
            <p className="mt-8 text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} {companyName}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
