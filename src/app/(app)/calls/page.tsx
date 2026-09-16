"use client";

import { useState, useMemo } from "react";
import { cn } from "cn";
import { useCRMData } from "@/lib/crm-data-context";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone,
  PhoneOff,
  PhoneForwarded,
  Clock,
  CalendarClock,
  Plus,
  Search,
  MessageSquare,
} from "lucide-react";

const today = "2026-09-14";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const outcomeOptions = [
  "Connected",
  "Not Connected",
  "Busy",
  "Interested",
  "Not Interested",
  "Callback Requested",
];

export default function CallsPage() {
  const { calls, leads, teamMembers } = useCRMData();
  const [search, setSearch] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const todayCalls = useMemo(
    () => calls.filter((c) => c.date === today),
    []
  );
  const completedCount = useMemo(
    () =>
      todayCalls.filter(
        (c) => c.outcome === "Connected" || c.outcome === "Interested"
      ).length,
    [todayCalls]
  );
  const missedCount = useMemo(
    () =>
      todayCalls.filter(
        (c) => c.outcome === "Not Connected" || c.outcome === "Busy"
      ).length,
    [todayCalls]
  );
  const upcomingCount = useMemo(
    () => calls.filter((c) => c.nextFollowup).length,
    []
  );

  const filteredCalls = useMemo(() => {
    if (!search) return calls;
    const q = search.toLowerCase();
    return calls.filter(
      (c) =>
        c.leadName.toLowerCase().includes(q) ||
        c.calledByName.toLowerCase().includes(q) ||
        c.outcome.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calls"
        description="Track and manage all your call activities"
        searchPlaceholder="Search calls..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button onClick={() => setLogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Log Call
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800/80 bg-zinc-900/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{todayCalls.length}</p>
              <p className="text-xs text-zinc-400">Today&apos;s Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800/80 bg-zinc-900/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <PhoneForwarded className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedCount}</p>
              <p className="text-xs text-zinc-400">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800/80 bg-zinc-900/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-500/10 p-2.5">
              <PhoneOff className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{missedCount}</p>
              <p className="text-xs text-zinc-400">Missed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800/80 bg-zinc-900/50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <CalendarClock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{upcomingCount}</p>
              <p className="text-xs text-zinc-400">Upcoming</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calls Table */}
      <Card className="border-zinc-800/80 bg-zinc-900/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-3">Lead</th>
                  <th className="hidden px-6 py-3 md:table-cell">Phone</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Date</th>
                  <th className="hidden px-6 py-3 md:table-cell">Time</th>
                  <th className="hidden px-6 py-3 lg:table-cell">Duration</th>
                  <th className="px-6 py-3">Outcome</th>
                  <th className="hidden px-6 py-3 md:table-cell">Called By</th>
                  <th className="hidden px-6 py-3 lg:table-cell">Next Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredCalls.map((call) => (
                  <tr
                    key={call.id}
                    className="text-sm transition-colors hover:bg-zinc-800/30"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-zinc-100">
                          {call.leadName}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-6 py-3.5 text-zinc-400 md:table-cell">
                      <div className="flex items-center gap-2">
                        <span>{call.phone}</span>
                        {call.phone && (
                          <a
                            href={`https://wa.me/${call.phone.replace(/[^0-9]/g, "").startsWith("91") || call.phone.replace(/[^0-9]/g, "").length > 10 ? call.phone.replace(/[^0-9]/g, "") : "91" + call.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            title="Chat on WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-6 py-3.5 text-zinc-400 sm:table-cell">
                      {call.date}
                    </td>
                    <td className="hidden px-6 py-3.5 text-zinc-400 md:table-cell">
                      {call.time}
                    </td>
                    <td className="hidden px-6 py-3.5 text-zinc-400 lg:table-cell">
                      {call.duration}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={call.outcome} />
                    </td>
                    <td className="hidden px-6 py-3.5 text-zinc-400 md:table-cell">
                      {call.calledByName}
                    </td>
                    <td className="hidden px-6 py-3.5 lg:table-cell">
                      {call.nextFollowup ? (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" />
                          {call.nextFollowup}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCalls.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-sm text-zinc-500"
                    >
                      No calls found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Call Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Lead</Label>
              <select className="flex h-8 w-full items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                <option value="">Select a lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} — {lead.company}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Call Date</Label>
                <Input
                  type="date"
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-violet-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Call Time</Label>
                <Input
                  type="time"
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-violet-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Duration</Label>
              <Input
                placeholder="e.g. 10 min"
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Outcome</Label>
              <select className="flex h-8 w-full items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                <option value="">Select outcome</option>
                {outcomeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Notes</Label>
              <Textarea
                placeholder="Add call notes..."
                className="min-h-20 border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Next Follow-up Date</Label>
              <Input
                type="date"
                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 focus:border-violet-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogOpen(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setLogOpen(false)}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              Save Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
