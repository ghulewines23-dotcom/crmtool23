import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import Client from "@/models/Client";
import TeamMember from "@/models/TeamMember";
import { requireAuth } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";

const orgId = "org1";

const seedTeamMembers = [
  { name: "Ayush Sharma", role: "owner", email: "ayush@techcorp.in", phone: "+91 98765 43210", avatar: "AS", activeLeads: 12, activeTasks: 5, completedTasks: 48, projects: 4, status: "active", organizationId: orgId },
  { name: "Rahul Verma", role: "manager", email: "rahul@techcorp.in", phone: "+91 98765 43211", avatar: "RV", activeLeads: 18, activeTasks: 8, completedTasks: 35, projects: 6, status: "active", organizationId: orgId },
  { name: "Sachin Kumar", role: "sales_agent", email: "sachin@techcorp.in", phone: "+91 98765 43212", avatar: "SK", activeLeads: 15, activeTasks: 6, completedTasks: 42, projects: 5, status: "active", organizationId: orgId },
  { name: "Priya Nair", role: "admin", email: "priya@techcorp.in", phone: "+91 98765 43213", avatar: "PN", activeLeads: 8, activeTasks: 4, completedTasks: 38, projects: 3, status: "active", organizationId: orgId },
  { name: "Vikram Singh", role: "sales_agent", email: "vikram@techcorp.in", phone: "+91 98765 43214", avatar: "VS", activeLeads: 14, activeTasks: 7, completedTasks: 52, projects: 5, status: "active", organizationId: orgId },
  { name: "Neha Gupta", role: "sales_agent", email: "neha@techcorp.in", phone: "+91 98765 43215", avatar: "NG", activeLeads: 10, activeTasks: 3, completedTasks: 29, projects: 4, status: "active", organizationId: orgId },
];

const seedLeads = [
  { name: "Amit Sharma", company: "TechVision Pvt Ltd", phone: "+91 99887 66554", email: "amit@techvision.in", website: "techvision.in", location: "Mumbai", source: "Google", interestedIn: "SEO + Website Redesign", status: "hot_lead", value: 60000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Complete website redesign and ongoing SEO campaign", notes: "Very interested, budget approved by management", organizationId: orgId },
  { name: "Sneha Patel", company: "GreenLeaf Organics", phone: "+91 99887 66555", email: "sneha@greenleaf.in", location: "Ahmedabad", source: "Facebook", interestedIn: "Social Media Marketing", status: "new", value: 35000, priority: "medium", assignedTo: "", assignedToName: "Sachin Kumar", requirement: "Social media marketing for organic food brand", organizationId: orgId },
  { name: "Rajesh Gupta", company: "Gupta Steel Trading", phone: "+91 99887 66556", email: "rajesh@guptasteel.com", location: "Delhi", source: "Referral", interestedIn: "PPC + Website", status: "processing", value: 45000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "PPC campaign and new website for steel business", organizationId: orgId },
  { name: "Ananya Reddy", company: "StyleHub Fashion", phone: "+91 99887 66557", email: "ananya@stylehub.in", website: "stylehub.in", location: "Hyderabad", source: "Instagram", interestedIn: "Branding + Social Media", status: "new", value: 50000, priority: "medium", assignedTo: "", assignedToName: "Priya Nair", requirement: "Branding and social media for fashion store", organizationId: orgId },
  { name: "Karthik Menon", company: "FinServe Solutions", phone: "+91 99887 66558", email: "karthik@finserve.in", location: "Bangalore", source: "LinkedIn", interestedIn: "SEO + Content Marketing", status: "won", value: 80000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "SEO and content marketing for fintech company", organizationId: orgId },
  { name: "Deepak Joshi", company: "Mountain Trails", phone: "+91 99887 66559", email: "deepak@mtrail.in", location: "Dehradun", source: "Website", interestedIn: "E-commerce Development", status: "processing", value: 120000, priority: "urgent", assignedTo: "", assignedToName: "Vikram Singh", requirement: "E-commerce website development for outdoor gear", organizationId: orgId },
  { name: "Meera Iyer", company: "Wellness Hub", phone: "+91 99887 66560", email: "meera@wellnesshub.com", website: "wellnesshub.com", location: "Chennai", source: "Google", interestedIn: "Website + Social Media", status: "not_connected", value: 30000, priority: "low", assignedTo: "", assignedToName: "Sachin Kumar", requirement: "Website redesign and social media setup for wellness center", organizationId: orgId },
  { name: "Sanjay Deshmukh", company: "AutoParts India", phone: "+91 99887 66561", email: "sanjay@autoparts.in", location: "Pune", source: "Cold Call", interestedIn: "PPC Campaign", status: "hot_lead", value: 55000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Google Ads PPC campaign for auto parts store", organizationId: orgId },
  { name: "Pooja Agarwal", company: "Bright Academy", phone: "+91 99887 66562", email: "pooja@brightacademy.in", location: "Jaipur", source: "JustDial", interestedIn: "SEO + Website", status: "new", value: 25000, priority: "medium", assignedTo: "", assignedToName: "Sachin Kumar", requirement: "SEO and website for coaching institute", organizationId: orgId },
  { name: "Arjun Nair", company: "Kerala Tourism Experiences", phone: "+91 99887 66563", email: "arjun@kter.in", website: "kter.in", location: "Kochi", source: "Referral", interestedIn: "Content Marketing", status: "overdue", value: 40000, priority: "high", assignedTo: "", assignedToName: "Neha Gupta", requirement: "Content marketing strategy for tourism company", organizationId: orgId },
  { name: "Vikas Sinha", company: "Patna Properties", phone: "+91 99887 66564", email: "vikas@patnaprop.in", location: "Patna", source: "Facebook", interestedIn: "Website + PPC", status: "lost", value: 20000, priority: "low", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Website and PPC for real estate business", organizationId: orgId },
  { name: "Ritu Verma", company: "Glow Skincare", phone: "+91 99887 66565", email: "ritu@glowskin.in", location: "Lucknow", source: "Instagram", interestedIn: "Social Media + Branding", status: "new", value: 30000, priority: "medium", assignedTo: "", assignedToName: "Priya Nair", requirement: "Social media marketing and branding for skincare brand", organizationId: orgId },
  { name: "Manish Tiwari", company: "IT Solutions Hub", phone: "+91 99887 66566", email: "manish@itsolutions.in", website: "itsolutions.in", location: "Noida", source: "Google", interestedIn: "App Development", status: "processing", value: 200000, priority: "urgent", assignedTo: "", assignedToName: "Vikram Singh", requirement: "Mobile app development for IT services company", organizationId: orgId },
  { name: "Kavita Sharma", company: "Delhi Food Festival", phone: "+91 99887 66567", email: "kavita@delfood.in", location: "Delhi", source: "LinkedIn", interestedIn: "Event Marketing", status: "not_connected", value: 35000, priority: "medium", assignedTo: "", assignedToName: "Sachin Kumar", requirement: "Event marketing and promotion for food festival", organizationId: orgId },
  { name: "Rohit Patel", company: "Ahmedabad Jewellers", phone: "+91 99887 66568", email: "rohit@ahmedjewels.in", location: "Ahmedabad", source: "Referral", interestedIn: "Branding + SEO", status: "won", value: 90000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Branding and SEO for jewellery business", organizationId: orgId },
  { name: "Nikhil Agarwal", company: "EduTech Learning", phone: "+91 99887 66569", email: "nikhil@edutech.in", location: "Kolkata", source: "WhatsApp", interestedIn: "LMS Development", status: "follow_up", value: 150000, priority: "high", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Learning management system development for ed-tech startup", organizationId: orgId },
  { name: "Simran Kaur", company: "Punjab Manufacturing", phone: "+91 99887 66570", email: "simran@punjabmfg.in", location: "Ludhiana", source: "Website", interestedIn: "ERP Integration", status: "processing", value: 180000, priority: "urgent", assignedTo: "", assignedToName: "Vikram Singh", requirement: "ERP integration and automation for manufacturing unit", organizationId: orgId },
  { name: "Farhan Sheikh", company: "Mumbai Real Estate", phone: "+91 99887 66571", email: "farhan@mre.in", location: "Mumbai", source: "Google", interestedIn: "Property Portal Development", status: "hot_lead", value: 250000, priority: "urgent", assignedTo: "", assignedToName: "Rahul Verma", requirement: "Property portal development for real estate agency", organizationId: orgId },
];

const seedClients = [
  { name: "Karthik Menon", company: "FinServe Solutions", email: "karthik@finserve.in", phone: "+91 99887 66558", website: "finserve.in", loginUrl: "https://finserve.in/admin", loginEmail: "karthik@finserve.in", password: "encrypted", accessNotes: "", service: "SEO + Content Marketing", totalAmount: 80000, amountPaid: 40000, balanceDue: 40000, paymentStatus: "partial", dueDate: "15-Oct-2026", notes: "Monthly retainer", paymentHistory: [], avatar: "KM", organizationId: orgId },
  { name: "Rohit Patel", company: "Ahmedabad Jewellers", email: "rohit@ahmedjewels.in", phone: "+91 99887 66568", website: "ahmedjewels.in", loginUrl: "", loginEmail: "rohit@ahmedjewels.in", password: "encrypted", accessNotes: "", service: "Branding + SEO", totalAmount: 90000, amountPaid: 90000, balanceDue: 0, paymentStatus: "paid", dueDate: "", notes: "", paymentHistory: [], avatar: "RP", organizationId: orgId },
  { name: "Vikram Reddy", company: "Reddy Constructions", email: "vikas@reddyconst.in", phone: "+91 99887 66570", website: "reddyconst.in", loginUrl: "", loginEmail: "", password: "", accessNotes: "", service: "Website + PPC", totalAmount: 35000, amountPaid: 0, balanceDue: 35000, paymentStatus: "pending", dueDate: "01-Nov-2026", notes: "New client onboarding", paymentHistory: [], avatar: "VR", organizationId: orgId },
  { name: "Shalini Gupta", company: "Mumbai Traders", email: "shalini@mumbaitraders.in", phone: "+91 99887 66571", website: "mumbaitraders.in", loginUrl: "", loginEmail: "", password: "", accessNotes: "", service: "Social Media + Content", totalAmount: 55000, amountPaid: 27500, balanceDue: 27500, paymentStatus: "partial", dueDate: "20-Oct-2026", notes: "", paymentHistory: [], avatar: "SG", organizationId: orgId },
  { name: "Anil Kapoor", company: "Delhi Electronics", email: "anil@delhielect.in", phone: "+91 99887 66572", website: "delhielect.in", loginUrl: "https://delhielect.in/tokens", loginEmail: "admin@delhielect.in", password: "encrypted", accessNotes: "Use VPN for access", service: "E-commerce + SEO + PPC", totalAmount: 70000, amountPaid: 70000, balanceDue: 0, paymentStatus: "paid", dueDate: "", notes: "", paymentHistory: [], avatar: "AK", organizationId: orgId },
  { name: "Pooja Singh", company: "Bangalore Startups Inc", email: "pooja@blrstartup.in", phone: "+91 99887 66573", website: "blrstartup.in", loginUrl: "", loginEmail: "", password: "", accessNotes: "", service: "Branding + Website", totalAmount: 30000, amountPaid: 10000, balanceDue: 20000, paymentStatus: "overdue", dueDate: "01-Sep-2026", notes: "Payment delayed", paymentHistory: [], avatar: "PS", organizationId: orgId },
];

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const targetOrg = auth.user.organizationId || orgId;

    // Check if data already exists for this org
    const existingTeam = await TeamMember.countDocuments({ organizationId: targetOrg });
    if (existingTeam > 0) {
      return Response.json({ success: true, message: "Database already seeded", seeded: false });
    }

    // Seed team members with hashed passwords
    const defaultPassword = await hashPassword("password123");
    const teamDocs = seedTeamMembers.map((m) => ({
      ...m,
      organizationId: targetOrg,
      passwordHash: defaultPassword,
    }));
    await TeamMember.insertMany(teamDocs, { ordered: false }).catch(() => {});

    // Seed leads
    const leadDocs = seedLeads.map((l) => ({ ...l, organizationId: targetOrg }));
    await Lead.insertMany(leadDocs, { ordered: false }).catch(() => {});

    // Seed clients
    const clientDocs = seedClients.map((c) => ({ ...c, organizationId: targetOrg }));
    await Client.insertMany(clientDocs, { ordered: false }).catch(() => {});

    return Response.json({
      success: true,
      message: "Database seeded successfully",
      seeded: true,
      counts: {
        team: teamDocs.length,
        leads: leadDocs.length,
        clients: clientDocs.length,
      },
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return Response.json(
      { success: false, error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
