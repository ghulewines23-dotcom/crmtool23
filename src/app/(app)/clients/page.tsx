"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, ArrowRight } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function emptyForm() {
  return {
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
  };
}

type FormSection = "client" | "login" | "payment";

export default function ClientsPage() {
  const { clients, addClient } = useCRMData();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [activeSection, setActiveSection] = useState<FormSection>("client");
  const [saving, setSaving] = useState(false);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    if (!form.name.trim() || saving) return;
    setSaving(true);

    const total = Number(form.totalAmount) || 0;
    const paid = Number(form.amountPaid) || 0;

    await addClient({
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
    });

    setForm(emptyForm());
    setActiveSection("client");
    setSaving(false);
    setOpen(false);
  }

  function handleClose() {
    setForm(emptyForm());
    setActiveSection("client");
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            Clients
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {clients.length} total clients
          </p>
        </div>
        <Button className="h-9 rounded-md" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-white pl-9 pr-3 text-[12px] outline-none placeholder:text-muted-foreground focus:border-foreground/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">
                  Client
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">
                  Service
                </th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                  Total
                </th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                  Paid
                </th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">
                  Balance
                </th>
                <th className="text-center text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">
                  Status
                </th>
                <th className="w-10 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">
                          {client.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {client.company || client.email}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">
                    {client.service || "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-right font-medium hidden sm:table-cell">
                    ₹{client.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-emerald-600 font-medium text-right hidden sm:table-cell">
                    ₹{client.amountPaid.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-right font-medium">
                    <span className={client.balanceDue > 0 ? "text-red-600" : ""}>
                      ₹{client.balanceDue.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${statusColors[client.paymentStatus]}`}
                    >
                      {client.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`}>
                      <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">
              No clients found
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/60">
              {clients.length === 0
                ? "Add your first client to get started."
                : "Try adjusting your search."}
            </p>
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Add a new client to your CRM.
            </DialogDescription>
          </DialogHeader>

          {/* Section Tabs */}
          <div className="flex gap-1 border-b border-border -mx-4 px-4 pb-2">
            <button
              onClick={() => setActiveSection("client")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                activeSection === "client"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Client Info
            </button>
            <button
              onClick={() => setActiveSection("login")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                activeSection === "login"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login Info
            </button>
            <button
              onClick={() => setActiveSection("payment")}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                activeSection === "payment"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Payment
            </button>
          </div>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {activeSection === "client" && (
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
                    placeholder="Client name"
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
                      placeholder="Company name"
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
                      placeholder="+91 XXXXX XXXXX"
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
                      placeholder="email@example.com"
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
                      placeholder="https://..."
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
                    placeholder="e.g. GMB Management"
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
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                  />
                </div>
              </>
            )}

            {activeSection === "login" && (
              <>
                <div className="space-y-1.5">
                  <Label>Login URL</Label>
                  <Input
                    value={form.loginUrl}
                    onChange={(e) =>
                      setForm({ ...form, loginUrl: e.target.value })
                    }
                    placeholder="https://..."
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
                      placeholder="username or email"
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
                      placeholder="••••••••"
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
                    placeholder="Any additional access info..."
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {activeSection === "payment" && (
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
                      placeholder="0"
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
                      placeholder="0"
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
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Save Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
