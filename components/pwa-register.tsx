"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

let deferredPrompt: Event | null = null;

export function useInstallPwa() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    if (alreadyInstalled) return;

    function handler(e: Event) {
      e.preventDefault();
      deferredPrompt = e;
      setInstallable(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const result = await (deferredPrompt as any).userChoice;
    if (result.outcome === "accepted") setInstallable(false);
    deferredPrompt = null;
  };

  return { installable, install };
}

export function PwaRegister() {
  const { installable, install } = useInstallPwa();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return installable ? (
    <button
      type="button"
      onClick={install}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-300/40 transition hover:bg-sky-500 active:scale-95"
    >
      <Download className="h-4 w-4" />
      Install App
    </button>
  ) : null;
}
