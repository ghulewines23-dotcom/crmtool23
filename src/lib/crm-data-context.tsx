"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "@/lib/auth-context";
import type {
  Lead,
  Client,
  Task,
  Project,
  Invoice,
  TeamMember,
  Proposal,
  Call,
  FollowUp,
  Activity,
  ActivityTimelineItem,
  BillingHistory,
} from "@/lib/types";

interface ImportHistory {
  id: string;
  fileName: string;
  dataType: string;
  status: "completed" | "failed" | "processing";
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: string;
  errors?: string[];
}

interface CRMDataState {
  leads: Lead[];
  clients: Client[];
  tasks: Task[];
  projects: Project[];
  invoices: Invoice[];
  teamMembers: TeamMember[];
  proposals: Proposal[];
  calls: Call[];
  followUps: FollowUp[];
  activities: Activity[];
  activityTimeline: ActivityTimelineItem[];
  billingHistory: BillingHistory[];
  importHistory: ImportHistory[];
}

interface CRMDataContextType extends CRMDataState {
  addLeads: (newLeads: Lead[]) => void;
  fetchLeads: () => Promise<void>;
  addClient: (client: Omit<Client, "id" | "organizationId" | "createdAt" | "paymentHistory" | "avatar">) => Promise<Client | null>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  fetchClients: () => Promise<void>;
  addTeamMembers: (newMembers: TeamMember[]) => void;
  updateTeamMember: (id: string, data: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "organizationId" | "createdAt">) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProjects: (newProjects: Project[]) => void;
  addInvoices: (newInvoices: Invoice[]) => void;
  addImportHistory: (history: ImportHistory) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  bulkDeleteLeads: (ids: string[]) => Promise<number>;
  getLeadById: (id: string) => Lead | undefined;
  fetchTeamMembers: () => Promise<void>;
}

const CRMDataContext = createContext<CRMDataContextType | null>(null);

function getAuthHeaders(): Record<string, string> {
  // Auth is now handled via HttpOnly cookie (sent automatically by browser).
  // No custom headers needed.
  return {};
}

export function CRMDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [proposals] = useState<Proposal[]>([]);
  const [calls] = useState<Call[]>([]);
  const [followUps] = useState<FollowUp[]>([]);
  const [activities] = useState<Activity[]>([]);
  const [activityTimeline] = useState<ActivityTimelineItem[]>([]);
  const [billingHistory] = useState<BillingHistory[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (data.success) {
        setClients(
          data.clients.map((c: Client & { _id: string }) => ({
            ...c,
            id: c._id,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, []);

  // Add client via API
  const addClient = useCallback(
    async (
      clientData: Omit<
        Client,
        "id" | "organizationId" | "createdAt" | "paymentHistory" | "avatar"
      >
    ) => {
      try {
        const initials = clientData.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const response = await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ ...clientData, avatar: initials }),
        });
        const data = await response.json();
        if (data.success) {
          const newClient = { ...data.client, id: data.client._id };
          setClients((prev) => [newClient, ...prev]);
          return newClient;
        }
        return null;
      } catch (error) {
        console.error("Error adding client:", error);
        return null;
      }
    },
    []
  );

  // Update client via API
  const updateClient = useCallback(
    async (id: string, data: Partial<Client>) => {
      try {
        const response = await fetch(`/api/clients/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.success) {
          setClients((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, ...result.client, id: result.client._id } : c
            )
          );
        }
      } catch (error) {
        console.error("Error updating client:", error);
      }
    },
    []
  );

  // Delete client via API
  const deleteClient = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setClients((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  }, []);

  const getClientById = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  );

  // Fetch team members from API
  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/team", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.members);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  }, []);

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch("/api/leads?limit=1000", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(
          data.leads.map((l: Lead & { _id?: string }) => ({
            ...l,
            id: String(l.id || l._id),
          }))
        );
      } else {
        console.warn("[fetchLeads] API returned:", data);
      }
    } catch (error) {
      console.error("[fetchLeads] Error:", error);
    }
  }, []);

  const addLeads = useCallback((newLeads: Lead[]) => {
    setLeads((prev) => [...prev, ...newLeads]);
  }, []);

  // Add team member via API
  const addTeamMembers = useCallback(
    async (newMembers: TeamMember[]) => {
      for (const member of newMembers) {
        try {
          const response = await fetch("/api/team", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              name: member.name,
              email: member.email,
              phone: member.phone,
              role: member.role,
            }),
          });
          const data = await response.json();
          if (data.success) {
            setTeamMembers((prev) => [
              { ...data.member, id: data.member._id },
              ...prev,
            ]);
          }
        } catch (error) {
          console.error("Error adding team member:", error);
        }
      }
    },
    []
  );

  // Update team member via API
  const updateTeamMember = useCallback(
    async (id: string, data: Partial<TeamMember>) => {
      try {
        const response = await fetch(`/api/team/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.success) {
          setTeamMembers((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, ...result.member, id: result.member._id }
                : m
            )
          );
        }
      } catch (error) {
        console.error("Error updating team member:", error);
      }
    },
    []
  );

  // Delete team member via API
  const deleteTeamMember = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/team/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting team member:", error);
    }
  }, []);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks", {
        cache: "no-store",
      });
      const data = await response.json();
      if (data.success) {
        setTasks(
          data.tasks.map((t: Task & { _id: string }) => ({
            ...t,
            id: t._id,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, []);

  // Add task via API
  const addTask = useCallback(
    async (
      taskData: Omit<Task, "id" | "organizationId" | "createdAt">
    ) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        const data = await response.json();
        if (data.success) {
          const newTask = { ...data.task, id: data.task._id };
          setTasks((prev) => [newTask, ...prev]);
          return newTask;
        }
        return null;
      } catch (error) {
        console.error("Error adding task:", error);
        return null;
      }
    },
    []
  );

  // Update task via API
  const updateTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.success) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, ...result.task, id: result.task._id } : t
            )
          );
        }
      } catch (error) {
        console.error("Error updating task:", error);
      }
    },
    []
  );

  // Delete task via API
  const deleteTask = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }, []);

  const addProjects = useCallback((newProjects: Project[]) => {
    setProjects((prev) => [...prev, ...newProjects]);
  }, []);

  const addInvoices = useCallback((newInvoices: Invoice[]) => {
    setInvoices((prev) => [...prev, ...newInvoices]);
  }, []);

  const addImportHistory = useCallback((history: ImportHistory) => {
    setImportHistory((prev) => [history, ...prev]);
  }, []);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === id ? { ...lead, ...result.lead, id: result.lead._id } : lead
          )
        );
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setLeads((prev) => prev.filter((lead) => lead.id !== id));
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  }, []);

  const bulkDeleteLeads = useCallback(async (ids: string[]) => {
    try {
      const response = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();
      if (data.success) {
        setLeads((prev) => prev.filter((lead) => !ids.includes(lead.id)));
        return data.deleted as number;
      }
      return 0;
    } catch (error) {
      console.error("Error bulk deleting leads:", error);
      return 0;
    }
  }, []);

  const getLeadById = useCallback(
    (id: string) => leads.find((lead) => lead.id === id),
    [leads]
  );

  // Fetch all data on mount — wait for auth to be ready first
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    fetchClients();
    fetchTeamMembers();
    fetchLeads();
    fetchTasks();
  }, [isLoading, isAuthenticated, fetchClients, fetchTeamMembers, fetchLeads, fetchTasks]);

  return (
    <CRMDataContext.Provider
      value={{
        leads,
        clients,
        tasks,
        projects,
        invoices,
        teamMembers,
        proposals,
        calls,
        followUps,
        activities,
        activityTimeline,
        billingHistory,
        importHistory,
        addLeads,
        fetchLeads,
        addClient,
        updateClient,
        deleteClient,
        getClientById,
        fetchClients,
        addTeamMembers,
        updateTeamMember,
        deleteTeamMember,
        fetchTasks,
        addTask,
        updateTask,
        deleteTask,
        addProjects,
        addInvoices,
        addImportHistory,
        updateLead,
        deleteLead,
        bulkDeleteLeads,
        getLeadById,
        fetchTeamMembers,
      }}
    >
      {children}
    </CRMDataContext.Provider>
  );
}

export function useCRMData() {
  const ctx = useContext(CRMDataContext);
  if (!ctx) throw new Error("useCRMData must be used within CRMDataProvider");
  return ctx;
}
