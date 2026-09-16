"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Globe,
  User,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Client, PaymentStatus } from "@/lib/types";

const statusColors: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
  partial: "bg-amber-50 text-amber-600 border-amber-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  overdue: "bg-red-50 text-red-600 border-red-200",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { clients, updateClient } = useCRMData();
  const { user, hasRole } = useAuth();
  const id = params.id as string;
  const client = clients.find((c) => c.id === id);

  const [editOpen, setEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editSection, setEditSection] = useState<
    "client" | "login" | "payment"
  >("client");

  const canEditCore = hasRole("FOUNDER", "ADMIN");
  const canEditPayment = hasRole("FOUNDER", "ADMIN");

  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    website: "",
    loginUrl: "",
    loginEmail: "",
    password: "",
    accessNotes: "",
    service: "",
    totalAmount: "",
    amountPaid: "",
    paymentStatus: "pending" as PaymentStatus,
    dueDate: "",
    notes: "",
  });

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <User className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Client not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The client you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/clients">
          <Button variant="outline" className="mt-6">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  function openEdit() {
    if (!client) return;
    setForm({
      name: client.name,
      company: client.company,
      phone: client.phone,
      email: client.email,
      website: client.website,
      loginUrl: client.loginUrl,
      loginEmail: client.loginEmail,
      password: client.password,
      accessNotes: client.accessNotes,
      service: client.service,
      totalAmount: String(client.totalAmount),
      amountPaid: String(client.amountPaid),
      paymentStatus: client.paymentStatus,
      dueDate: client.dueDate,
      notes: client.notes,
    });
    setEditSection("client");
    setEditOpen(true);
  }

  async function handleSave() {
    if (!client) return;
    const total = Number(form.totalAmount) || 0;
    const paid = Number(form.amountPaid) || 0;
    const initials = form.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    await updateClient(client.id, {
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      loginUrl: form.loginUrl.trim(),
      loginEmail: form.loginEmail.trim(),
      password: form.password,
      accessNotes: form.accessNotes.trim(),
      service: form.service.trim(),
      totalAmount: total,
      amountPaid: paid,
      balanceDue: total - paid,
      paymentStatus: form.paymentStatus,
      dueDate: form.dueDate.trim(),
      notes: form.notes.trim(),
      avatar: initials,
    });
    setEditOpen(false);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
              {client.avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[28px] font-semibold tracking-tight">
                {client.name}
              </h1>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${statusColors[client.paymentStatus]}`}
              >
                {client.paymentStatus}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {client.company}
            </p>
            <div className="mt-1.5 flex items-center gap-4 text-[12px] text-muted-foreground">
              {client.phone && <span>{client.phone}</span>}
              {client.email && <span>{client.email}</span>}
            </div>
          </div>
        </div>
        {(canEditCore || canEditPayment) && (
          <Button
            variant="outline"
            className="h-9 rounded-md self-start"
            onClick={openEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit Client
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Client Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Name
                  </p>
                  <p className="text-[13px] font-medium">{client.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Company
                  </p>
                  <p className="text-[13px] font-medium">
                    {client.company || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-[13px] font-medium">
                    {client.phone || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-[13px] font-medium">
                    {client.email || "—"}
                  </p>
                </div>
                {client.website && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                      Website
                    </p>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {client.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {client.service && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                      Service
                    </p>
                    <p className="text-[13px] font-medium">
                      {client.service}
                    </p>
                  </div>
                )}
              </div>
              {client.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {client.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Login Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Login Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                {client.loginUrl && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                      Login URL
                    </p>
                    <a
                      href={client.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {client.loginUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Username / Email
                  </p>
                  <p className="text-[13px] font-medium">
                    {client.loginEmail || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Password
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium font-mono">
                      {showPassword ? client.password : "••••••••"}
                    </p>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {client.accessNotes && (
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                      Access Notes
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {client.accessNotes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deals / Follow-ups placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">
                Deals & Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[13px] text-muted-foreground py-4 text-center">
                No deals or follow-ups linked yet.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    Total
                  </span>
                  <span className="text-[14px] font-semibold">
                    ₹{client.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    Paid
                  </span>
                  <span className="text-[14px] font-semibold text-emerald-600">
                    ₹{client.amountPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[12px] text-muted-foreground">
                    Balance
                  </span>
                  <span
                    className={`text-[14px] font-semibold ${client.balanceDue > 0 ? "text-red-600" : ""}`}
                  >
                    ₹{client.balanceDue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${statusColors[client.paymentStatus]}`}
                  >
                    {client.paymentStatus}
                  </span>
                </div>
                {client.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">
                      Due Date
                    </span>
                    <span className="text-[13px] font-medium">
                      {client.dueDate}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {client.paymentHistory.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
                    Payment History
                  </p>
                  <div className="space-y-2">
                    {client.paymentHistory.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <div>
                          <p className="font-medium">
                            ₹{record.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="text-muted-foreground">
                            {record.date} · {record.mode}
                          </p>
                        </div>
                        {record.note && (
                          <p className="text-muted-foreground text-right max-w-[120px] truncate">
                            {record.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information below.
            </DialogDescription>
          </DialogHeader>

          {/* Section Tabs */}
          <div className="flex gap-1 border-b border-border -mx-4 px-4 pb-2">
            <button
              onClick={() => setEditSection("client")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                editSection === "client"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Client Info
            </button>
            {canEditCore && (
              <button
                onClick={() => setEditSection("login")}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  editSection === "login"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login Info
              </button>
            )}
            {canEditPayment && (
              <button
                onClick={() => setEditSection("payment")}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  editSection === "payment"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Payment
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {editSection === "client" && (
              <>
                <div className="space-y-1.5">
                  <Label>
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Input
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input
                      value={form.website}
                      onChange={(e) =>
                        setForm({ ...form, website: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Service</Label>
                  <Input
                    value={form.service}
                    onChange={(e) =>
                      setForm({ ...form, service: e.target.value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                  />
                </div>
              </>
            )}

            {editSection === "login" && canEditCore && (
              <>
                <div className="space-y-1.5">
                  <Label>Login URL</Label>
                  <Input
                    value={form.loginUrl}
                    onChange={(e) =>
                      setForm({ ...form, loginUrl: e.target.value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Username / Email</Label>
                    <Input
                      value={form.loginEmail}
                      onChange={(e) =>
                        setForm({ ...form, loginEmail: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Access Notes</Label>
                  <Input
                    value={form.accessNotes}
                    onChange={(e) =>
                      setForm({ ...form, accessNotes: e.target.value })
                    }
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {editSection === "payment" && canEditPayment && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Total Amount (₹)</Label>
                    <Input
                      type="number"
                      value={form.totalAmount}
                      onChange={(e) =>
                        setForm({ ...form, totalAmount: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount Paid (₹)</Label>
                    <Input
                      type="number"
                      value={form.amountPaid}
                      onChange={(e) =>
                        setForm({ ...form, amountPaid: e.target.value })
                      }
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Balance</Label>
                  <Input
                    value={`₹${(
                      (Number(form.totalAmount) || 0) -
                      (Number(form.amountPaid) || 0)
                    ).toLocaleString("en-IN")}`}
                    readOnly
                    className="h-9 text-[13px] bg-muted"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Payment Status</Label>
                    <select
                      value={form.paymentStatus}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          paymentStatus: e.target.value as PaymentStatus,
                        })
                      }
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm({ ...form, dueDate: e.target.value })
                      }
                      placeholder="DD-MM-YYYY"
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
