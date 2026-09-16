"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  User,
} from "lucide-react";
import type { Task, TaskStatus, Priority } from "@/lib/types";

function emptyForm() {
  return {
    title: "",
    description: "",
    client: "",
    project: "",
    assignedTo: "",
    assignedToName: "",
    priority: "medium" as Priority,
    startDate: "",
    dueDate: "",
    status: "todo" as TaskStatus,
  };
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const priorityColors: Record<Priority, string> = {
  low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function PlatformTasksPage() {
  const { user } = useAuth();
  const { tasks, teamMembers, addTask, updateTask, deleteTask } = useCRMData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const orgTasks = tasks.filter(
    (t) => t.organizationId === user?.organizationId
  );

  const filtered = orgTasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.client || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedToName || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const orgMembers = teamMembers.filter(
    (m) => m.organizationId === user?.organizationId
  );

  function handleOpen(task?: Task) {
    if (task) {
      setEditingTask(task);
      setForm({
        title: task.title,
        description: task.description || "",
        client: task.client || "",
        project: task.project || "",
        assignedTo: task.assignedTo || "",
        assignedToName: task.assignedToName || "",
        priority: task.priority || "medium",
        startDate: task.startDate || "",
        dueDate: task.dueDate || "",
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setForm(emptyForm());
    }
    setOpen(true);
  }

  function handleClose() {
    setForm(emptyForm());
    setEditingTask(null);
    setOpen(false);
  }

  async function handleSave() {
    if (!form.title.trim() || saving) return;
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      client: form.client.trim(),
      project: form.project.trim(),
      assignedTo: form.assignedTo,
      assignedToName: form.assignedToName,
      priority: form.priority,
      startDate: form.startDate,
      dueDate: form.dueDate,
      status: form.status,
    };

    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await addTask(payload);
    }

    handleClose();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setConfirmDelete(null);
  }

  function handleAssigneeChange(memberName: string) {
    const member = orgMembers.find((m) => m.name === memberName);
    setForm({
      ...form,
      assignedTo: member?.id || "",
      assignedToName: memberName,
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tasks</h1>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            {orgTasks.length} total tasks
          </p>
        </div>
        <Button
          className="h-9 rounded-md bg-white text-black hover:bg-zinc-200"
          onClick={() => handleOpen()}
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-[13px] text-white outline-none focus:border-zinc-500"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400">
                Title
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400 hidden md:table-cell">
                Client
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400 hidden lg:table-cell">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400 hidden md:table-cell">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-400 hidden md:table-cell">
                Due Date
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-zinc-400 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-white">
                      {t.title}
                    </p>
                    {t.project && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {t.project}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px] text-zinc-400 hidden md:table-cell">
                  {t.client || "—"}
                </td>
                <td className="px-4 py-3 text-[13px] text-zinc-400 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-zinc-500" />
                    {t.assignedToName || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityColors[t.priority || "medium"]}`}
                  >
                    {t.priority || "medium"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${statusColors[t.status]}`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-zinc-400 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    {t.startDate || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px] text-zinc-400 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    {t.dueDate || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpen(t)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-zinc-400">
              No tasks found
            </p>
            <p className="mt-1 text-[12px] text-zinc-600">
              {orgTasks.length === 0
                ? "Add your first task to get started."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingTask
                ? "Update the task details below."
                : "Create a new task for your team."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Task title"
                className="h-9 text-[13px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Description</Label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Task description..."
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-[13px] text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 resize-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Client</Label>
                <Input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="Client name"
                  className="h-9 text-[13px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Project</Label>
                <Input
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  placeholder="Project name"
                  className="h-9 text-[13px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Assigned To</Label>
                <select
                  value={form.assignedToName}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-[13px] text-white outline-none focus:border-zinc-500"
                >
                  <option value="">Unassigned</option>
                  {orgMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Priority</Label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as Priority })
                  }
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-[13px] text-white outline-none focus:border-zinc-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Status</Label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as TaskStatus })
                }
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-[13px] text-white outline-none focus:border-zinc-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="h-9 text-[13px] bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="h-9 text-[13px] bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {saving
                ? "Saving..."
                : editingTask
                  ? "Update Task"
                  : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
