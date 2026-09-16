"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User, Organization, Subscription, OrgMembership, Notification } from "@/lib/types";

// ─── State & Context Types ───────────────────────────────────────────────────

interface OrgWithDetails extends OrgMembership {
  name: string;
  status: string;
  isActive: boolean;
  subscription: {
    plan: string;
    status: string;
    maxLeads: number;
    maxMembers: number;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string;
  } | null;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    phone?: string;
    industry?: string;
  }) => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (...roles: User["role"][]) => boolean;
  hasCrmAccess: boolean;
  isFounder: boolean;
  isAdmin: boolean;
  isSalesPerson: boolean;
  isPlatformOwner: boolean;
  // Multi-org
  organizations: OrgWithDetails[];
  switchOrganization: (organizationId: string) => Promise<void>;
  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: (ids?: string[]) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

function mapSessionResponse(data: {
  user: User;
  organization?: Organization | null;
  subscription?: Subscription | null;
}): AuthState {
  return {
    user: data.user,
    organization: data.organization ?? null,
    subscription: data.subscription ?? null,
    isAuthenticated: true,
    isLoading: false,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    subscription: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [organizations, setOrganizations] = useState<OrgWithDetails[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    if (!state.user || state.user.role === "SERENE_OWNER") return;
    try {
      const res = await fetch("/api/notifications?limit=20", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadNotificationCount(data.unreadCount || 0);
      }
    } catch {
      // Silent fail
    }
  }, [state.user]);

  // ── Mark notifications as read ──
  const markNotificationsRead = useCallback(async (ids?: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: ids
          ? JSON.stringify({ notificationIds: ids })
          : JSON.stringify({ markAll: true }),
      });
      // Refresh notifications
      await fetchNotifications();
    } catch {
      // Silent fail
    }
  }, [fetchNotifications]);

  // ── Fetch organizations list ──
  const fetchOrganizations = useCallback(async () => {
    if (!state.user || state.user.role === "SERENE_OWNER") return;
    try {
      const res = await fetch("/api/auth/organizations", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success && data.organizations) {
        setOrganizations(data.organizations);
      }
    } catch {
      // Silent fail
    }
  }, [state.user]);

  // ── Switch organization ──
  const switchOrganization = useCallback(async (organizationId: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const res = await fetch("/api/auth/switch-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to switch organization");
      }
      // Update state with new org
      setState((s) => ({
        ...s,
        user: data.user ? { ...s.user!, ...data.user } : s.user,
        organization: data.organization ?? s.organization,
        subscription: data.subscription ?? s.subscription,
        isLoading: false,
      }));
      // Refresh org list
      await fetchOrganizations();
    } catch (error) {
      setState((s) => ({ ...s, isLoading: false }));
      throw error;
    }
  }, [fetchOrganizations]);

  // ── Session check on mount — source of truth for auth state ──
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success && data.user) {
        setState(mapSessionResponse(data));
      } else {
        setState({
          user: null,
          organization: null,
          subscription: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.user) {
          setState(mapSessionResponse(data));
        } else {
          setState({
            user: null,
            organization: null,
            subscription: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch orgs and notifications when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      fetchOrganizations();
      fetchNotifications();
    }
  }, [state.isAuthenticated, state.user, fetchOrganizations, fetchNotifications]);

  // ── Login ──
  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      setState((s) => ({ ...s, isLoading: false }));
      throw new Error(data.error || "Login failed");
    }
    setState(mapSessionResponse(data));
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Continue even if request fails
    }
    setState({
      user: null,
      organization: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setOrganizations([]);
    setNotifications([]);
    setUnreadNotificationCount(0);
  }, []);

  // ── Signup ──
  const signup = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      businessName: string;
      phone?: string;
      industry?: string;
    }) => {
      setState((s) => ({ ...s, isLoading: true }));
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          businessName: data.businessName,
          phone: data.phone || "",
          industry: data.industry || "",
        }),
      });
      const result = await res.json();
      if (!result.success) {
        setState((s) => ({ ...s, isLoading: false }));
        throw new Error(result.error || "Signup failed");
      }
      setState(mapSessionResponse(result));
    },
    []
  );

  // ── Role helpers ──
  const hasRole = useCallback(
    (...roles: User["role"][]) => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  const isFounder = state.user?.role === "FOUNDER";
  const isAdmin = state.user?.role === "ADMIN";
  const isSalesPerson = state.user?.role === "SALES_PERSON";
  const isPlatformOwner = state.user?.role === "SERENE_OWNER";

  // CRM access: TRIAL or ACTIVE subscription, org not suspended
  const hasCrmAccess =
    !!state.user &&
    (state.subscription?.status === "TRIAL" ||
      state.subscription?.status === "ACTIVE") &&
    state.organization?.status !== "SUSPENDED" &&
    state.organization?.status !== "EXPIRED";

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        signup,
        refreshSession,
        hasRole,
        hasCrmAccess,
        isFounder,
        isAdmin,
        isSalesPerson,
        isPlatformOwner,
        // Multi-org
        organizations,
        switchOrganization,
        // Notifications
        notifications,
        unreadNotificationCount,
        fetchNotifications,
        markNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
