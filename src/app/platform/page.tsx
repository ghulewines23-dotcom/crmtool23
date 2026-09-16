"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Tab = "payments" | "organizations" | "users" | "auditLogs";

interface PaymentItem {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string | null;
  organizationName?: string | null;
  plan: string;
  amount: number;
  paymentLinkId: string;
  paymentId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  submittedAt: string;
  notes?: string;
}

interface OrgItem {
  _id: string;
  id: string;
  name: string;
  founderId: string;
  founderEmail?: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
  plan?: string;
  leadCount?: number;
  maxLeads?: number;
  memberCount?: number;
  maxMembers?: number;
  createdAt: string;
}

interface UserItem {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
  status: string;
  createdAt: string;
}

interface AuditLogItem {
  _id: string;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export default function PlatformAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("payments");
  const [loading, setLoading] = useState(false);

  // Data states
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");

  const [organizations, setOrganizations] = useState<OrgItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState("");

  // Modal states for Create Organization from Payment
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [createOrgForm, setCreateOrgForm] = useState({
    orgName: "",
    founderId: "",
    plan: "STARTER",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/payments?status=${paymentStatusFilter}`);
      const data = await res.json();
      if (data.success) setPayments(data.payments);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    }
    setLoading(false);
  }, [paymentStatusFilter]);

  // Fetch orgs
  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/organizations");
      const data = await res.json();
      if (data.success) setOrganizations(data.organizations);
    } catch (err) {
      console.error("Failed to fetch orgs:", err);
    }
    setLoading(false);
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/users");
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
    setLoading(false);
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/audit-logs");
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
    if (activeTab === "organizations") fetchOrgs();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "auditLogs") fetchAuditLogs();
  }, [activeTab, fetchPayments, fetchOrgs, fetchUsers, fetchAuditLogs]);

  // Verify payment (Approve / Reject)
  async function verifyPayment(paymentId: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/platform/payments/${paymentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      }
    } catch (err) {
      console.error("Verify payment failed:", err);
    }
  }

  // Open Create Org Modal for an Approved Payment
  function openCreateOrgModal(payment: PaymentItem) {
    setSelectedPayment(payment);
    setCreateOrgForm({
      orgName: payment.organizationName || `${payment.userName || "Customer"}'s Business`,
      founderId: payment.userId,
      plan: payment.plan || "STARTER",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setCreateOrgOpen(true);
  }

  // Submit Create & Activate Organization
  async function handleCreateOrgSubmit() {
    if (!selectedPayment) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/platform/payments/${selectedPayment._id}/create-org`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createOrgForm),
      });
      const data = await res.json();
      if (data.success) {
        setCreateOrgOpen(false);
        fetchPayments();
        fetchOrgs();
      } else {
        alert(data.error || "Failed to create organization");
      }
    } catch (err) {
      console.error("Create org error:", err);
      alert("Error creating organization");
    }
    setSubmitting(false);
  }

  // Toggle Org Status (Activate / Suspend)
  async function toggleOrgStatus(orgId: string, currentStatus: string) {
    const newStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      const res = await fetch(`/api/platform/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchOrgs();
    } catch (err) {
      console.error("Toggle org status error:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CreditCard className="h-4 w-4" /> Pending Payments
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600">
            {payments.filter((p) => p.status === "PENDING").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Building2 className="h-4 w-4" /> Total Organizations
          </div>
          <p className="text-2xl font-bold mt-1">{organizations.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Users className="h-4 w-4" /> Total Users
          </div>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <ShieldCheck className="h-4 w-4" /> Audit Events
          </div>
          <p className="text-2xl font-bold mt-1">{auditLogs.length}</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          {(
            [
              { id: "payments", label: "Payments", icon: CreditCard },
              { id: "organizations", label: "Organizations", icon: Building2 },
              { id: "users", label: "Users", icon: Users },
              { id: "auditLogs", label: "Audit Logs", icon: ShieldCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === "payments") fetchPayments();
            if (activeTab === "organizations") fetchOrgs();
            if (activeTab === "users") fetchUsers();
            if (activeTab === "auditLogs") fetchAuditLogs();
          }}
          disabled={loading}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* TAB 1: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setPaymentStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    paymentStatusFilter === st
                      ? "bg-foreground text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{payments.length} payments</p>
          </div>

          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold">Customer / User</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold">Payment ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.userName || "Customer"}</p>
                      <p className="text-muted-foreground text-[11px]">{p.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.plan}</td>
                    <td className="px-4 py-3 font-semibold">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{p.paymentId}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.submittedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : p.status === "PENDING"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyPayment(p._id, "approve")}
                            className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyPayment(p._id, "reject")}
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {p.status === "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => openCreateOrgModal(p)}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create Organization
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORGANIZATIONS */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold">Organization Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Founder</th>
                  <th className="text-left px-4 py-3 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Leads Used / Max</th>
                  <th className="text-left px-4 py-3 font-semibold">Members Used / Max</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => (
                  <tr key={org._id || org.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-semibold">{org.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{org.founderEmail || org.founderId}</td>
                    <td className="px-4 py-3 font-semibold">{org.plan || "FREE_TRIAL"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          org.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : org.status === "TRIAL"
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {org.leadCount ?? 0} / {org.maxLeads ?? 20}
                    </td>
                    <td className="px-4 py-3">
                      {org.memberCount ?? 1} / {org.maxMembers ?? 1}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOrgStatus(org._id || org.id, org.status)}
                        className={`h-7 text-xs ${
                          org.status === "SUSPENDED"
                            ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            : "text-red-600 border-red-200 hover:bg-red-50"
                        }`}
                      >
                        {org.status === "SUSPENDED" ? "Activate" : "Suspend"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold">User Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Organization ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u._id || u.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{u.role}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{u.organizationId || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "auditLogs" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">Actor Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Target</th>
                  <th className="text-left px-4 py-3 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2.5 font-sans font-semibold">{log.actorEmail}</td>
                    <td className="px-4 py-2.5 text-primary font-bold">{log.action}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {log.targetType}: {log.targetId || "N/A"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-xs">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit log records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ORGANIZATION MODAL */}
      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create & Activate Organization</DialogTitle>
            <DialogDescription>
              Confirm details to activate customer organization and subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label>Organization Name</Label>
              <Input
                value={createOrgForm.orgName}
                onChange={(e) => setCreateOrgForm({ ...createOrgForm, orgName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label>Selected Plan</Label>
              <select
                value={createOrgForm.plan}
                onChange={(e) => setCreateOrgForm({ ...createOrgForm, plan: e.target.value })}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none"
              >
                <option value="STARTER">STARTER (₹1,000 / mo — 50 leads, 3 members)</option>
                <option value="GROWTH">GROWTH (₹3,000 / mo — 200 leads, 5 members)</option>
                <option value="PRO">PRO (₹5,000 / mo — 300 leads, 10 members)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={createOrgForm.startDate}
                  onChange={(e) => setCreateOrgForm({ ...createOrgForm, startDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={createOrgForm.endDate}
                  onChange={(e) => setCreateOrgForm({ ...createOrgForm, endDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setCreateOrgOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateOrgSubmit} disabled={submitting}>
              {submitting ? "Activating..." : "CREATE & ACTIVATE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
