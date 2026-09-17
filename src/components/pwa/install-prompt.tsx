"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setInstallEvent(null);
    }
  }, [installEvent]);

  if (installed) return null;

  return (
    <>
      {installEvent && !dismissed && (
        <button
          type="button"
          onClick={handleInstall}
          className="animate-in fade-in slide-in-from-bottom-4 zoom-in-95 fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-blue-700 shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-50 hover:shadow-blue-600/30 active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <Download className="h-3.5 w-3.5" />
          </span>
          Install App
          <span
            role="button"
            aria-label="Dismiss install prompt"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
          >
            <X className="h-3.5 w-3.5 text-blue-300 hover:text-blue-600" />
          </span>
        </button>
      )}

      {isIOS && !showIOS && !installEvent && (
        <button
          type="button"
          onClick={() => setShowIOS(true)}
          className="animate-in fade-in slide-in-from-bottom-4 zoom-in-95 fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 shadow-lg shadow-slate-400/20 transition-all duration-200 hover:bg-slate-50 active:scale-95"
        >
          <Share className="h-4 w-4 text-slate-500" />
          Install App
        </button>
      )}

      {isIOS && showIOS && (
        <div className="animate-in fade-in slide-in-from-up-4 zoom-in-95 fixed bottom-20 right-4 z-50 w-[290px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-500/20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-800">Install Serene CRM</p>
            <button type="button" onClick={() => setShowIOS(false)} aria-label="Close">
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          <ol className="mt-3 space-y-2 text-[12px] text-slate-600">
            <li>1. Tap the <b>Share</b> <Share className="inline h-3 w-3 text-slate-500" /> button in Safari.</li>
            <li>2. Scroll down and tap <b>Add to Home Screen</b> <Download className="inline h-3 w-3 text-slate-500" />.</li>
            <li>3. Tap <b>Add</b> — Serene CRM appears on your home screen.</li>
          </ol>
        </div>
      )}
    </>
  );
}