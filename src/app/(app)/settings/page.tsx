"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import type { PaymentStatus, TeamMember } from "@/lib/types";

export default function SettingsPage() {
  const { addClient, addTeamMembers } = useCRMData();
  const [clientOpen, setClientOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const [clientForm, setClientForm] = useState({
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

  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "SALES_PERSON" as TeamMember["role"],
  });

  async function handleAddClient() {
    if (!clientForm.name) return;
    const total = Number(clientForm.totalAmount) || 0;
    const paid = Number(clientForm.amountPaid) || 0;

    await addClient({
      name: clientForm.name.trim(),
      company: clientForm.company.trim(),
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim(),
      website: clientForm.website.trim(),
      loginUrl: clientForm.loginUrl.trim(),
      loginEmail: clientForm.loginEmail.trim(),
      password: clientForm.password,
      accessNotes: clientForm.accessNotes.trim(),
      service: clientForm.service.trim(),
      totalAmount: total,
      amountPaid: paid,
      balanceDue: total - paid,
      paymentStatus: clientForm.paymentStatus,
      dueDate: clientForm.dueDate.trim(),
      notes: clientForm.notes.trim(),
    });

    setClientForm({
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
      paymentStatus: "pending",
      dueDate: "",
      notes: "",
    });
    setClientOpen(false);
  }

  function handleAddTeam() {
    if (!teamForm.name || !teamForm.email) return;
    const initials = teamForm.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: teamForm.name,
      email: teamForm.email,
      phone: teamForm.phone,
      role: teamForm.role,
      avatar: initials,
      activeLeads: 0,
      activeTasks: 0,
      completedTasks: 0,
      projects: 0,
      status: "active",
      organizationId: "",
    };
    addTeamMembers([newMember]);
    setTeamForm({ name: "", email: "", phone: "", role: "SALES_PERSON" });
    setTeamOpen(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">
        Settings
      </h1>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Client</CardTitle>
            <CardDescription>Add a new client to your CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-9 rounded-md"
              onClick={() => setClientOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Team Member</CardTitle>
            <CardDescription>
              Add a new member to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-9 rounded-md"
              onClick={() => setTeamOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>Add a new client to your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Client Info
              </h3>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, name: e.target.value })
                    }
                    placeholder="Client name"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Input
                      value={clientForm.company}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          company: e.target.value,
                        })
                      }
                      placeholder="Company name"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={clientForm.phone}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          phone: e.target.value,
                        })
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
                      value={clientForm.email}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="email@example.com"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input
                      value={clientForm.website}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          website: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Login Info
              </h3>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Login URL</Label>
                  <Input
                    value={clientForm.loginUrl}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        loginUrl: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Username / Email</Label>
                    <Input
                      value={clientForm.loginEmail}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          loginEmail: e.target.value,
                        })
                      }
                      placeholder="username or email"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={clientForm.password}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          password: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Access Notes</Label>
                  <Input
                    value={clientForm.accessNotes}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        accessNotes: e.target.value,
                      })
                    }
                    placeholder="Any additional access info..."
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Payment
              </h3>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Service</Label>
                  <Input
                    value={clientForm.service}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        service: e.target.value,
                      })
                    }
                    placeholder="e.g. GMB Management"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Total Amount (₹)</Label>
                    <Input
                      type="number"
                      value={clientForm.totalAmount}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          totalAmount: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount Paid (₹)</Label>
                    <Input
                      type="number"
                      value={clientForm.amountPaid}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          amountPaid: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Balance</Label>
                    <Input
                      value={`₹${(
                        (Number(clientForm.totalAmount) || 0) -
                        (Number(clientForm.amountPaid) || 0)
                      ).toLocaleString("en-IN")}`}
                      readOnly
                      className="h-9 text-[13px] bg-muted"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Payment Status</Label>
                    <select
                      value={clientForm.paymentStatus}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
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
                      value={clientForm.dueDate}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          dueDate: e.target.value,
                        })
                      }
                      placeholder="DD-MM-YYYY"
                      className="h-9 text-[13px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                value={clientForm.notes}
                onChange={(e) =>
                  setClientForm({ ...clientForm, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient}>Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Fill in the team member details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, name: e.target.value })
                }
                placeholder="Full name"
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={teamForm.email}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, email: e.target.value })
                }
                placeholder="email@example.com"
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={teamForm.phone}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, phone: e.target.value })
                }
                placeholder="+91 XXXXX XXXXX"
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={teamForm.role}
                onChange={(e) =>
                  setTeamForm({
                    ...teamForm,
                    role: e.target.value as TeamMember["role"],
                  })
                }
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none"
              >
                <option value="SALES_PERSON">Sales Person</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTeam}>Add Team Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
