"use client";

import { useState, useEffect, useCallback } from "react";
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
  Clock,
  User,
  ShieldCheck,
  Crown,
  Briefcase,
  FileText,
} from "lucide-react";
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

export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, teamMembers, addTask, updateTask, deleteTask } = useCRMData();

  const isOwner = user?.role === "SERENE_OWNER" || user?.role === "FOUNDER";

  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeRoleTab, setActiveRoleTab] = useState<"sales" | "admin" | "owner">("sales");

  // Automatically default tab to logged-in user's role
  useEffect(() => {
    if (user?.role) {
      if (user.role === "SERENE_OWNER" || user.role === "FOUNDER") {
        setActiveRoleTab("owner");
      } else if (user.role === "ADMIN") {
        setActiveRoleTab("admin");
      } else {
        setActiveRoleTab("sales");
      }
    }
  }, [user?.role]);

  // Robustly determine creator role even if missing in legacy DB documents
  const getTaskCreatorRole = useCallback(
    (t: Task): "owner" | "admin" | "sales" => {
      const role = t.createdByRole;
      if (role === "SERENE_OWNER" || role === "FOUNDER") return "owner";
      if (role === "ADMIN") return "admin";
      if (role === "SALES_PERSON") return "sales";

      // If createdBy matches current user, use user's role
      if (t.createdBy && user?.id && t.createdBy === user.id) {
        if (user.role === "SERENE_OWNER" || user.role === "FOUNDER") return "owner";
        if (user.role === "ADMIN") return "admin";
        return "sales";
      }

      // Check team members list
      const member = teamMembers.find(
        (m) => m.id === t.createdBy || m.name === t.createdByName
      );
      if (member) {
        if (member.role === "SERENE_OWNER" || member.role === "FOUNDER") return "owner";
        if (member.role === "ADMIN") return "admin";
        return "sales";
      }

      return "sales";
    },
    [teamMembers, user]
  );

  // Categorize tasks into role sections
  const ownerTasks = tasks.filter((t) => getTaskCreatorRole(t) === "owner");
  const adminTasks = tasks.filter((t) => getTaskCreatorRole(t) === "admin");
  const salesTasks = tasks.filter((t) => getTaskCreatorRole(t) === "sales");

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

    const creatorRole = user?.role || "SALES_PERSON";

    const payload = {
      title: form.task.trim(),
      description: form.notes.trim(),
      notes: form.notes.trim(),
      startDate: form.startDate,
      dueDate: form.endDate,
      status: form.status,
      createdBy: user?.id,
      createdByName: user?.name,
      createdByRole: creatorRole,
    };

    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await addTask(payload as any);
      // Switch active tab to creator's role section after adding
      if (creatorRole === "SERENE_OWNER" || creatorRole === "FOUNDER") {
        setActiveRoleTab("owner");
      } else if (creatorRole === "ADMIN") {
        setActiveRoleTab("admin");
      } else {
        setActiveRoleTab("sales");
      }
    }

    handleClose();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setConfirmDelete(null);
  }

  async function handleToggleStatus(task: Task) {
    const isCreator = task.createdBy === user?.id;
    if (!isOwner && !isCreator) return;
    const nextStatus: TaskStatus = task.status === "completed" ? "todo" : "completed";
    await updateTask(task.id, { status: nextStatus });
  }

  const currentRoleTasks =
    activeRoleTab === "owner"
      ? ownerTasks
      : activeRoleTab === "admin"
      ? adminTasks
      : salesTasks;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage & track role-based team tasks with simple CRUD operations.
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="h-9 px-4 rounded-lg gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveRoleTab("owner")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all",
            activeRoleTab === "owner"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 hover:bg-muted text-muted-foreground"
          )}
        >
          <Crown className="h-4 w-4 text-amber-400" />
          Owner Tasks
          <span className="ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-background/20">
            {ownerTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRoleTab("admin")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all",
            activeRoleTab === "admin"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 hover:bg-muted text-muted-foreground"
          )}
        >
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          Admins Tasks
          <span className="ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-background/20">
            {adminTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveRoleTab("sales")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all",
            activeRoleTab === "sales"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 hover:bg-muted text-muted-foreground"
          )}
        >
          <Briefcase className="h-4 w-4 text-emerald-400" />
          Sales Persons Tasks
          <span className="ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-background/20">
            {salesTasks.length}
          </span>
        </button>
      </div>

      {/* Role Section Title & Context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeRoleTab === "owner" && <Crown className="h-4 w-4 text-amber-500" />}
          {activeRoleTab === "admin" && <ShieldCheck className="h-4 w-4 text-blue-500" />}
          {activeRoleTab === "sales" && <Briefcase className="h-4 w-4 text-emerald-500" />}
          <h2 className="text-base font-semibold">
            {activeRoleTab === "owner" && "Owner Tasks"}
            {activeRoleTab === "admin" && "Admins Tasks"}
            {activeRoleTab === "sales" && "Sales Persons Tasks"}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {currentRoleTasks.length} task{currentRoleTasks.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Tasks List Grid */}
      {currentRoleTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed p-8 bg-muted/20">
          <FileText className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            No tasks created in this section yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add Task&quot; above to create a new task.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentRoleTasks.map((task) => {
            const isCreator = task.createdBy === user?.id;
            const canEditOrDelete = isOwner || isCreator;
            const creatorName = task.createdByName || task.assignedToName || "User";

            return (
              <div
                key={task.id}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 bg-card transition-all hover:shadow-md",
                  task.status === "completed" ? "border-emerald-200 bg-emerald-50/20 opacity-80" : "border-border"
                )}
              >
                <div>
                  {/* Top Bar: Title & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleStatus(task)}
                        disabled={!canEditOrDelete}
                        className={cn(
                          "mt-0.5 rounded-full transition-colors shrink-0",
                          task.status === "completed" ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={canEditOrDelete ? "Toggle status" : "View only"}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <h3
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          task.status === "completed" && "line-through text-muted-foreground"
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
                  {/* Creator Tag */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {creatorName}
                    </span>

                    <span
                      className={cn(
                        "font-medium px-2 py-0.5 rounded-full capitalize text-[10px]",
                        task.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Start Date & End Date */}
                  {(task.startDate || task.dueDate) && (
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {task.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          Start: <strong className="text-foreground">{task.startDate}</strong>
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          End: <strong className="text-foreground">{task.dueDate}</strong>
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
                : "Create a new minimal task. It will automatically list under your role section."}
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

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-start-date">Start Date</Label>
                <Input
                  id="task-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-end-date">End Date</Label>
                <Input
                  id="task-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 text-xs sm:text-sm"
                />
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
