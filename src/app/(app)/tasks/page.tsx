"use client";

import { useState, useCallback } from "react";
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
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Users,
  ListFilter,
  FileText,
  Search,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomSelect } from "@/components/ui/custom-select";
import { ScrollDateTimePickerModal } from "@/components/ui/scroll-datetime-picker";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";

function emptyForm() {
  return {
    task: "",
    notes: "",
    startDate: "",
    endDate: "",
    status: "todo" as TaskStatus,
  };
}

function formatRole(role?: string) {
  if (!role) return "";
  if (role === "SERENE_OWNER") return "Serene Owner";
  if (role === "FOUNDER") return "Owner";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; pill: string }
> = {
  todo: {
    label: "To Do",
    dot: "bg-zinc-400",
    pill: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  review: {
    label: "Review",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, teamMembers, addTask, updateTask, deleteTask, bulkDeleteTasks } =
    useCRMData();

  const isOwner = user?.role === "SERENE_OWNER" || user?.role === "FOUNDER";

  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── View filters ──
  // "mine" = only the logged-in user's own tasks (default)
  // "all"  = every task in the org
  // <userId> = tasks of that specific member
  const [userFilter, setUserFilter] = useState<string>("mine");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [search, setSearch] = useState("");

  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Date/time pickers in the Add/Edit dialog ──
  const [pickerField, setPickerField] = useState<"startDate" | "endDate" | null>(null);

  // Format an ISO date-time into a friendly "12 Sep, 07:02 pm" string
  function formatDateTime(value?: string) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Build the user-filter dropdown options (All Users + each active member)
  const userOptions = [
    { value: "mine", label: "My Tasks" },
    { value: "all", label: "All Users" },
    ...teamMembers
      .filter((m) => m.status === "active")
      .map((m) => ({
        value: m.id,
        label: `${m.name}${m.role ? ` · ${formatRole(m.role)}` : ""}`,
      })),
  ];

  // A task belongs to the person it was assigned to (defaults to its creator)
  const taskOwnerId = useCallback(
    (t: Task) => t.assignedTo || t.createdBy || "",
    []
  );

  const scopedTasks = tasks.filter((t) => {
    if (userFilter === "all") return true;
    if (userFilter === "mine") return taskOwnerId(t) === user?.id;
    return taskOwnerId(t) === userFilter;
  });

  const visibleTasks = scopedTasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${t.title} ${t.notes || ""} ${t.description || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const openCount = scopedTasks.filter((t) => t.status !== "completed").length;
  const doneCount = scopedTasks.filter((t) => t.status === "completed").length;

  // Only the task CREATOR (or an org owner) may manage a task.
  const canManage = useCallback(
    (t: Task) => isOwner || (!!t.createdBy && t.createdBy === user?.id),
    [isOwner, user?.id]
  );

  // Tasks the current user is allowed to select/delete (creator or org owner)
  const selectableTasks = visibleTasks.filter(canManage);
  const allSelected =
    selectableTasks.length > 0 &&
    selectableTasks.every((t) => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (selectableTasks.every((t) => prev.has(t.id))) {
        // Deselect only the currently visible selectable tasks
        const next = new Set(prev);
        selectableTasks.forEach((t) => next.delete(t.id));
        return next;
      }
      const next = new Set(prev);
      selectableTasks.forEach((t) => next.add(t.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    await bulkDeleteTasks([...selectedIds]);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    setBulkDeleting(false);
  }

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "completed", label: "Completed" },
  ];

  function handleOpen(task?: Task) {
    if (task) {
      setEditingTask(task);
      setForm({
        task: task.title || "",
        notes: task.notes || task.description || "",
        startDate: task.startDate || "",
        endDate: task.dueDate || "",
        status: task.status || "todo",
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
    if (!form.task.trim() || saving) return;
    setSaving(true);

    const payload = {
      title: form.task.trim(),
      description: form.notes.trim(),
      notes: form.notes.trim(),
      startDate: form.startDate,
      dueDate: form.endDate,
      status: form.status,
    };

    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      // New tasks are automatically assigned to whoever created them
      await addTask({
        ...payload,
        assignedTo: user?.id,
        assignedToName: user?.name,
        createdBy: user?.id,
        createdByName: user?.name,
        createdByRole: user?.role || "SALES_PERSON",
      } as any);
      // Make sure the freshly created task is visible to the creator
      setUserFilter((prev) => (prev === "all" ? "all" : "mine"));
    }

    handleClose();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmDelete(null);
  }

  async function handleToggleStatus(task: Task) {
    if (!canManage(task)) return;
    const nextStatus: TaskStatus = task.status === "completed" ? "todo" : "completed";
    await updateTask(task.id, { status: nextStatus });
  }


  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create tasks for yourself and track what everyone on the team is working on.
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="h-9 px-4 rounded-lg gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Total
          </p>
          <p className="text-xl font-bold mt-0.5">{scopedTasks.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Open
          </p>
          <p className="text-xl font-bold mt-0.5 text-blue-600">{openCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Completed
          </p>
          <p className="text-xl font-bold mt-0.5 text-emerald-600">{doneCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* User filter dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-11 items-center gap-2 rounded-2xl border-zinc-200 bg-white px-3 text-zinc-500">
            <Users className="h-4 w-4" />
          </div>
          <CustomSelect
            options={userOptions}
            value={userFilter}
            onChange={setUserFilter}
            placeholder="My Tasks"
            className="w-full sm:w-64"
          />
        </div>

        {/* Status filter dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-11 items-center gap-2 rounded-2xl border-zinc-200 bg-white px-3 text-zinc-500">
            <ListFilter className="h-4 w-4" />
          </div>
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | TaskStatus)}
            placeholder="All Statuses"
            className="w-full sm:w-48"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-11 rounded-2xl pl-9"
          />
          </div>
        </div>

        {/* Selection toolbar */}
        {visibleTasks.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
              label={allSelected ? "Deselect all" : "Select all"}
              className={cn(someSelected && "opacity-90")}
            />

            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8 gap-1.5 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="h-8 gap-1.5 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete selected
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Select tasks to delete them in bulk
              </span>
            )}
          </div>
        )}

        {/* Tasks List */}
        {visibleTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed p-8 bg-muted/20">
          <FileText className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            {scopedTasks.length === 0
              ? userFilter === "mine"
                ? "You have no tasks yet."
                : "No tasks for this user yet."
              : "No tasks match your filters."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add Task&quot; above to create a new task.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTasks.map((task) => {
            const isMine = taskOwnerId(task) === user?.id;
            const canEditOrDelete = canManage(task);
            const ownerName = task.assignedToName || task.createdByName || "User";
            const meta = STATUS_META[task.status] || STATUS_META.todo;
            const isDone = task.status === "completed";

            return (
              <div
                key={task.id}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 bg-card transition-all hover:shadow-md",
                  selectedIds.has(task.id) && "ring-2 ring-zinc-900/60",
                  isDone ? "border-emerald-200 bg-emerald-50/20 opacity-90" : "border-border"
                )}
              >
                <div>
                  {/* Top Bar: Title & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2">
                      {canEditOrDelete && (
                        <div className="mt-0.5 shrink-0">
                          <Checkbox
                            checked={selectedIds.has(task.id)}
                            onChange={() => toggleSelect(task.id)}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        disabled={!canEditOrDelete}
                        className={cn(
                          "mt-0.5 rounded-full transition-colors shrink-0",
                          isDone ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={canEditOrDelete ? "Toggle status" : "View only"}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                      <h3
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          isDone && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </h3>
                    </div>

                    {/* Actions: ONLY shown if creator or owner */}
                    {canEditOrDelete && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpen(task)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Task"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(task.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {(task.notes || task.description) && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3 bg-muted/30 p-2 rounded-md">
                      {task.notes || task.description}
                    </p>
                  )}
                </div>

                {/* Footer Meta */}
                <div className="space-y-2 border-t pt-2.5 mt-2">
                  {/* Owner Tag */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {ownerName}
                      {isMine && (
                        <span className="text-[9px] font-semibold text-muted-foreground">(you)</span>
                      )}
                    </span>

                    <span
                      className={cn(
                        "flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border text-[10px]",
                        meta.pill
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                  </div>

                  {/* Start Date & End Date */}
                  {(task.startDate || task.dueDate) && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {task.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          Start: <strong className="text-foreground">{formatDateTime(task.startDate)}</strong>
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          End: <strong className="text-foreground">{formatDateTime(task.dueDate)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update task details below."
                : "Create a task. It is automatically assigned to you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Task Title */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title">
                Task <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-title"
                value={form.task}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
                placeholder="Enter task title..."
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="task-notes">Notes</Label>
              <textarea
                id="task-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Add any notes or extra details..."
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs sm:text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Start / End Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date &amp; time</Label>
                <button
                  type="button"
                  onClick={() => setPickerField("startDate")}
                  className="flex h-10 w-full items-center gap-2 rounded-md border-input bg-transparent px-3 text-xs sm:text-sm text-left transition-colors hover:bg-muted/40"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span
                    className={cn(
                      "truncate",
                      !form.startDate && "text-muted-foreground"
                    )}
                  >
                    {form.startDate ? formatDateTime(form.startDate) : "Set date & time"}
                  </span>
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>End date &amp; time</Label>
                <button
                  type="button"
                  onClick={() => setPickerField("endDate")}
                  className="flex h-10 w-full items-center gap-2 rounded-md border-input bg-transparent px-3 text-xs sm:text-sm text-left transition-colors hover:bg-muted/40"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span
                    className={cn(
                      "truncate",
                      !form.endDate && "text-muted-foreground"
                    )}
                  >
                    {form.endDate ? formatDateTime(form.endDate) : "Set date & time"}
                  </span>
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.task.trim()}>
              {saving ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date & Time Wheel Picker (shared style with Leads follow-up) */}
      <ScrollDateTimePickerModal
        isOpen={pickerField !== null}
        initialDate={
          pickerField === "startDate" ? form.startDate : form.endDate
        }
        title={
          pickerField === "startDate" ? "Set start date & time" : "Set end date & time"
        }
        onClose={() => setPickerField(null)}
        onSet={(iso) => {
          if (pickerField) {
            setForm((f) => ({ ...f, [pickerField]: iso }));
          }
        }}
        onClear={() => {
          if (pickerField) {
            setForm((f) => ({ ...f, [pickerField]: "" }));
          }
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={confirmBulkDelete} onOpenChange={() => setConfirmBulkDelete(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} task{selectedIds.size === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              You are about to permanently delete {selectedIds.size} selected task
              {selectedIds.size === 1 ? "" : "s"}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Deleting..." : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
