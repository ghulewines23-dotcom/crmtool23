"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Web Push + reminder runtime.
 *
 * - Registers the service worker and watches for new deployments (auto reload).
 * - Subscribes the signed-in CRM user to push notifications so tasks/follow-ups
 *   ring with sound on mobile even when the app isn't open.
 * - Polls /api/reminders/check every minute so reminders also fire while the
 *   app is open and when server-side VAPID keys aren't configured yet.
 * - Plays an in-app chime when a push arrives.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const POLL_MS = 60_000;
const UPDATE_CHECK_MS = 30 * 60_000;

type PushStatus = "idle" | "enabled" | "disabled" | "denied";

interface PushContextType {
  supported: boolean;
  configured: boolean;
  enabled: boolean;
  permission: NotificationPermission | null;
  status: PushStatus;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const PushContext = createContext<PushContextType | null>(null);

function toUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Array<number>(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Uint8Array(bytes);
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };
    play(880, now, 0.55);
    play(1318, now + 0.16, 0.6);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // Audio unavailable — skip chime
  }
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isPlatformOwner, fetchNotifications } = useAuth();

  const [supported] = useState(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const userRef = useRef<string | null>(null);
  const reloadingRef = useRef(false);

  const refreshPermission = useCallback(() => {
    if (!("Notification" in window)) {
      setPermission(null);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  // ── SW registration + update handling ──
  useEffect(() => {
    if (!supported) return;

    let disposed = false;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (disposed) return;
        registrationRef.current = reg;

        // Auto reload once when a freshly deployed SW takes over.
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloadingRef.current) return;
          reloadingRef.current = true;
          window.location.reload();
        });
      })
      .catch(() => {});

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_RECEIVED") {
        if (document.visibilityState === "visible") playChime();
        fetchNotifications();
      }
      // When a new SW activated (new deploy pushed), the swipe-to-update
      // message triggers a reload handled above via controllerchange.
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Read Notification permission after mount (async to avoid a synchronous
    // state update inside the effect).
    const permissionTimer = setTimeout(() => refreshPermission(), 0);

    // Periodically look for newly deployed updates.
    const updateTimer = setInterval(() => {
      registrationRef.current?.update().catch(() => {});
    }, UPDATE_CHECK_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshPermission();
        registrationRef.current?.update().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      clearTimeout(permissionTimer);
      clearInterval(updateTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [supported, refreshPermission, fetchNotifications]);

  // ── Auto-subscribe when permission already granted + rebind on user change ──
  useEffect(() => {
    if (!supported || !VAPID_PUBLIC_KEY || !isAuthenticated || isPlatformOwner) return;
    if (!permission) return;

    const sync = async () => {
      if (permission !== "granted") return;
      try {
        const registration = registrationRef.current || (await navigator.serviceWorker.ready);
        const existing = await registration.pushManager.getSubscription();
        let subscription = existing;
        if (!existing) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        if (!subscription) return;
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setConfigured(Boolean(data.configured));
          setEnabled(true);
        }
      } catch {
        setEnabled(false);
      }
    };
    sync();
  }, [supported, isAuthenticated, isPlatformOwner, permission, user?.id]);

  // ── Turn on push (called from the bell dropdown) ──
  const enable = useCallback(async () => {
    if (!supported) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    try {
      const registration = registrationRef.current || (await navigator.serviceWorker.ready);
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription && VAPID_PUBLIC_KEY) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      if (!subscription) return;
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigured(Boolean(data.configured));
        setEnabled(true);
      }
    } catch {
      setEnabled(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return;
    try {
      const registration = registrationRef.current || (await navigator.serviceWorker.ready);
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
    } catch {
      // local cleanup below still applies
    }
    setEnabled(false);
  }, [supported]);

  // Rebind the stored subscription when the signed-in user changes, and reset
  // local state on logout. Async on purpose (no synchronous state in effects).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        userRef.current = null;
        setEnabled(false);
      } else if (user?.id && userRef.current && userRef.current !== user.id) {
        userRef.current = user.id;
        setEnabled(false);
      } else if (user?.id && !userRef.current) {
        userRef.current = user.id;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user?.id, isAuthenticated]);

  // ── 1-minute reminder poller for the open app ──
  useEffect(() => {
    if (!isAuthenticated || isPlatformOwner) return;

    const check = async () => {
      try {
        const res = await fetch("/api/reminders/check", { credentials: "same-origin" });
        const data = await res.json();
        if (!data.success || !Array.isArray(data.notified) || data.notified.length === 0) return;

        const visible = document.visibilityState === "visible";
        if (visible) playChime();

        // If we can't rely on an OS push, surface a local notification.
        const canShow = "Notification" in window && Notification.permission === "granted";
        if (canShow && (!enabled || !configured)) {
          const registration = registrationRef.current || (await navigator.serviceWorker.ready);
          const { id } = data.notified[0];
          const first = data.notified[0];
          registration.showNotification(first.title, {
            body: first.message,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-maskable-512x512.png",
            tag: `inapp-${id}`,
            data: { url: first.url || "/" },
          }).catch(() => {});
        }
        fetchNotifications();
      } catch {
        // silent — next tick
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, isPlatformOwner, enabled, configured, fetchNotifications]);

  const value: PushContextType = {
    supported,
    configured,
    enabled,
    permission,
    status: enabled ? "enabled" : permission === "denied" ? "denied" : "disabled",
    enable,
    disable,
  };

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePush() {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within PushProvider");
  return ctx;
}