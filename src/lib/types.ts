// ─── Multi-Tenant SaaS CRM Types ───

export type UserRole = "SERENE_OWNER" | "FOUNDER" | "ADMIN" | "SALES_PERSON";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PENDING" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
export type SubscriptionPlan = "FREE_TRIAL" | "STARTER" | "GROWTH" | "PRO";
export type OrganizationStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";
export type LeadStatus = "new" | "not_connected" | "processing" | "follow_up" | "hot_lead" | "won" | "lost" | "overdue";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";
export type Priority = "low" | "medium" | "high" | "urgent";
export type CallOutcome = "Connected" | "Not Connected" | "Busy" | "Interested" | "Not Interested" | "Callback Requested";
export type ProjectStatus = "planning" | "in_progress" | "review" | "completed" | "on_hold";
export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";
export type ClientStatus = "active" | "onboarding" | "paused" | "completed";

// ─── Organization & Auth ───

export interface Organization {
  id: string;
  name: string;
  industry: string;
  website?: string;
  phone: string;
  country: string;
  logo?: string;
  status: OrganizationStatus;
  founderId: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  organizationId: string;
  organizations: OrgMembership[];
  status: "active" | "inactive" | "invited";
}

export interface OrgMembership {
  organizationId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Subscription {
  id?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  maxLeads: number;
  maxMembers: number;
  trialEndsAt?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

// ─── Notifications ───

export type NotificationType = "invitation_accepted" | "invitation_declined" | "org_joined" | "member_joined" | "general";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  organizationId?: string | null;
  invitationId?: string | null;
  read: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

// ─── CRM Core ───

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  location: string;
  source: string;
  sourceUrl?: string;
  interestedIn: string;
  status: LeadStatus;
  value: number;
  priority: Priority;
  assignedTo: string;
  assignedToName: string;
  nextFollowup?: string;
  lastActivity: string;
  createdAt: string;
  requirement: string;
  notes?: string;
  organizationId: string;
  aiTemperature?: "cold" | "warm" | "hot" | null;
  aiIntent?: string | null;
  aiPriority?: number | null;
  aiSummary?: string | null;
  aiNextAction?: string | null;
  aiConfidence?: number | null;
  aiAnalyzedAt?: string | null;
}

export interface Call {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  date: string;
  time: string;
  duration: string;
  outcome: CallOutcome;
  calledBy: string;
  calledByName: string;
  nextFollowup?: string;
  notes?: string;
  organizationId: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  time: string;
  date: string;
  service: string;
  assignedTo: string;
  assignedToName: string;
  lastConversation: string;
  type: "overdue" | "today" | "tomorrow" | "upcoming";
  organizationId: string;
}

export type PaymentStatus = "pending" | "partial" | "paid" | "overdue";

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  mode: string;
  note?: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  loginUrl: string;
  loginEmail: string;
  password: string;
  accessNotes: string;
  service: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  dueDate: string;
  notes: string;
  paymentHistory: PaymentRecord[];
  avatar: string;
  organizationId: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientName: string;
  projectName: string;
  service: string;
  progress: number;
  deadline: string;
  team: string[];
  status: ProjectStatus;
  organizationId: string;
}

export interface Task {
  id: string;
  title: string;
  client: string;
  project: string;
  assignedTo: string;
  assignedToName: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
  organizationId: string;
}

export interface Proposal {
  id: string;
  client: string;
  services: string;
  amount: number;
  created: string;
  sent: string;
  status: ProposalStatus;
  organizationId: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  organizationId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  phone: string;
  activeLeads: number;
  activeTasks: number;
  completedTasks: number;
  projects: number;
  status: "active" | "inactive" | "invited";
  organizationId: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: "call" | "lead" | "proposal" | "task" | "payment" | "meeting" | "email" | "status_change" | "note";
  organizationId: string;
}

export interface ActivityTimelineItem {
  id: string;
  date: string;
  time: string;
  type: string;
  description: string;
  user: string;
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  invoiceUrl?: string;
}
