"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCRMData } from "@/lib/crm-data-context";
import type { Lead } from "@/lib/types";

interface LeadFormProps {
  lead?: Lead | null;
  onClose: () => void;
}

export function LeadForm({ lead, onClose }: LeadFormProps) {
  const { teamMembers } = useCRMData();
  const [name, setName] = useState("");
  const [requirement, setRequirement] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState("new");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setRequirement(lead.requirement);
      setCompany(lead.company);
      setPhone(lead.phone);
      setEmail(lead.email);
      setSource(lead.source);
      setSourceUrl(lead.sourceUrl || "");
      setStatus(lead.status);
      setLocation(lead.location);
      setNotes(lead.notes || "");
      setAssignedTo(lead.assignedToName);
    }
  }, [lead]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-border shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">
            {lead ? "Edit Lead" : "Add New Lead"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Requirement *
            </label>
            <textarea
              required
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              className="h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 resize-none"
              placeholder="What does the customer need?"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Company *
            </label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Phone *
            </label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="Contact person name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground mb-1">
                Lead Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40"
              >
                <option value="">Select</option>
                <option>Google</option>
                <option>Facebook</option>
                <option>Instagram</option>
                <option>Referral</option>
                <option>Website</option>
                <option>LinkedIn</option>
                <option>Cold Call</option>
                <option>JustDial</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40"
              >
                <option value="new">New</option>
                <option value="not_connected">Not Connected</option>
                <option value="processing">Processing</option>
                <option value="follow_up">Follow-up</option>
                <option value="hot_lead">Hot</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Source URL
            </label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="City, Area"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 resize-none"
              placeholder="Additional notes..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40"
            >
              <option value="">Select team member</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" className="h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="h-9" onClick={handleSubmit}>
            {lead ? "Save Changes" : "Save Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
