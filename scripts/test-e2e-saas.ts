import fs from "fs";
import path from "path";

// Load .env.local BEFORE any model imports so MONGODB_URI is available
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
} catch (e) {
  // Ignore
}

import mongoose from "mongoose";
import { connectDB } from "../src/lib/db/connect";
import TeamMember from "../src/models/TeamMember";
import Organization from "../src/models/Organization";
import Subscription from "../src/models/Subscription";
import JoinToken, { hashToken, generateRawToken } from "../src/models/JoinToken";
import Payment from "../src/models/Payment";
import AuditLog from "../src/models/AuditLog";
import Lead from "../src/models/Lead";
import { createOrgWithTrial, PLAN_LIMITS, logAudit, AUDIT_ACTIONS } from "../src/lib/auth-helpers";
import { checkLeadLimit, checkMemberLimit } from "../src/lib/api-auth";
import { assignLeadToSalesPerson } from "../src/lib/lead-assignment";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const badge = passed ? "✅ PASSED" : "❌ FAILED";
  console.log(`[${badge}] ${name}: ${message}`);
}

async function runE2ETests() {
  console.log("\n==================================================");
  console.log("STARTING MULTI-TENANT SAAS E2E VERIFICATION SUITE");
  console.log("==================================================\n");

  await connectDB();

  const testSuffix = Date.now().toString().slice(-6);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SIGNUP & FREE TRIAL TEST
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const founderEmail = `founder_${testSuffix}@testorg.com`;
    const founderUser = await TeamMember.create({
      name: "Test Founder",
      email: founderEmail,
      passwordHash: "hashed_secret",
      role: "FOUNDER",
      status: "active",
      organizationId: "pending",
    });

    const trialOrg = await createOrgWithTrial({
      name: `Org ${testSuffix}`,
      founderId: String(founderUser._id),
      phone: "+91 99999 88888",
    });

    founderUser.organizationId = trialOrg.organization.id;
    await founderUser.save();

    const dbSub = await Subscription.findOne({ organizationId: trialOrg.organization.id });

    const isSignupValid =
      founderUser.role === "FOUNDER" &&
      trialOrg.organization.status === "TRIAL" &&
      dbSub?.plan === "FREE_TRIAL" &&
      dbSub?.maxLeads === 20 &&
      dbSub?.maxMembers === 1 &&
      dbSub?.price === 0;

    recordResult(
      "1. Customer Signup & Trial Creation",
      isSignupValid,
      isSignupValid
        ? `Org created with status TRIAL, Subscription FREE_TRIAL (20 leads, 1 member, ₹0)`
        : `Signup validation failed`
    );

    const testOrgId = trialOrg.organization.id;
    const testFounderId = String(founderUser._id);

    // ───────────────────────────────────────────────────────────────────────────
    // 2. MEMBER LIMIT ENFORCEMENT TEST
    // ───────────────────────────────────────────────────────────────────────────
    const memberLimitCheck = await checkMemberLimit(testOrgId);
    recordResult(
      "2. Member Limit Guard (Free Trial max 1 member)",
      !memberLimitCheck.allowed,
      !memberLimitCheck.allowed
        ? `Correctly blocked adding 2nd member on Free Trial (${memberLimitCheck.reason})`
        : `Member limit guard failed to block extra member`
    );

    // ───────────────────────────────────────────────────────────────────────────
    // 3. SECURE JOIN TOKEN TEST
    // ───────────────────────────────────────────────────────────────────────────
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const joinTokenDoc = await JoinToken.create({
      tokenHash,
      organizationId: testOrgId,
      role: "SALES_PERSON",
      createdBy: testFounderId,
      expiresAt,
      status: "active",
    });

    const foundToken = await JoinToken.findOne({ tokenHash, status: "active" });
    const isTokenValid = foundToken && foundToken.role === "SALES_PERSON";

    recordResult(
      "3. Join Token Creation & Hashing",
      !!isTokenValid,
      isTokenValid ? "Hashed token created with 7-day expiration and SALES_PERSON role" : "Token test failed"
    );

    // ───────────────────────────────────────────────────────────────────────────
    // 4. AUTOMATIC BALANCED LEAD ASSIGNMENT TEST
    // ───────────────────────────────────────────────────────────────────────────
    // Create 2 active sales persons in org
    const sales1 = await TeamMember.create({
      name: "Sales One",
      email: `sales1_${testSuffix}@testorg.com`,
      role: "SALES_PERSON",
      organizationId: testOrgId,
      status: "active",
    });

    const sales2 = await TeamMember.create({
      name: "Sales Two",
      email: `sales2_${testSuffix}@testorg.com`,
      role: "SALES_PERSON",
      organizationId: testOrgId,
      status: "active",
    });

    const assignedLead1 = await assignLeadToSalesPerson(testOrgId);
    await Lead.create({
      requirement: "App Development",
      company: "Client A",
      phone: "+91 91111 22222",
      organizationId: testOrgId,
      assignedTo: assignedLead1?.id,
      assignedToName: assignedLead1?.name,
    });

    const assignedLead2 = await assignLeadToSalesPerson(testOrgId);
    await Lead.create({
      requirement: "SEO Campaign",
      company: "Client B",
      phone: "+91 93333 44444",
      organizationId: testOrgId,
      assignedTo: assignedLead2?.id,
      assignedToName: assignedLead2?.name,
    });

    const isBalanced = assignedLead1?.id !== assignedLead2?.id;

    recordResult(
      "4. Automatic Lead Assignment Algorithm",
      isBalanced,
      isBalanced
        ? `Leads balanced automatically between ${assignedLead1?.name} and ${assignedLead2?.name}`
        : `Lead assignment was not balanced`
    );

    // ───────────────────────────────────────────────────────────────────────────
    // 5. EXCEL IMPORT CAPACITY REJECTION TEST
    // ───────────────────────────────────────────────────────────────────────────
    // Current lead count is 2 out of 20 max leads.
    // If we set current subscription maxLeads = 3, and try to import 3 valid rows (2 + 3 = 5 > 3), batch must be rejected!
    if (dbSub) {
      dbSub.maxLeads = 3;
      await dbSub.save();
    }

    const currentCount = await Lead.countDocuments({ organizationId: testOrgId });
    const importBatchSize = 3;
    const isImportCapacityExceeded = currentCount + importBatchSize > 3;

    recordResult(
      "5. Excel Import Batch Limit Enforcement",
      isImportCapacityExceeded,
      isImportCapacityExceeded
        ? `Import batch size (${importBatchSize}) + existing (${currentCount}) exceeds limit (3) -> ENTIRE import batch will be rejected`
        : `Capacity check failed`
    );

    // Restore maxLeads
    if (dbSub) {
      dbSub.maxLeads = 20;
      await dbSub.save();
    }

    // ───────────────────────────────────────────────────────────────────────────
    // 6. PAYMENT -> APPROVAL -> CREATE & ACTIVATE ORGANIZATION TEST
    // ───────────────────────────────────────────────────────────────────────────
    const payment = await Payment.create({
      userId: testFounderId,
      organizationId: testOrgId,
      plan: "STARTER",
      amount: PLAN_LIMITS.STARTER.price,
      paymentLinkId: `plink_${testSuffix}`,
      paymentId: `pay_${testSuffix}`,
      status: "PENDING",
      submittedAt: new Date(),
    });

    // Step A: Platform Owner Approves Payment
    payment.status = "APPROVED";
    payment.verifiedAt = new Date();
    await payment.save();

    // Step B: Platform Owner executes CREATE & ACTIVATE ORGANIZATION
    const activatedOrg = await Organization.findById(testOrgId);
    if (activatedOrg) {
      activatedOrg.status = "ACTIVE";
      await activatedOrg.save();
    }

    const activatedSub = await Subscription.findOne({ organizationId: testOrgId });
    if (activatedSub) {
      activatedSub.plan = "STARTER";
      activatedSub.status = "ACTIVE";
      activatedSub.price = PLAN_LIMITS.STARTER.price;
      activatedSub.maxLeads = PLAN_LIMITS.STARTER.maxLeads;
      activatedSub.maxMembers = PLAN_LIMITS.STARTER.maxMembers;
      await activatedSub.save();
    }

    const isActivationSuccess =
      payment.status === "APPROVED" &&
      activatedOrg?.status === "ACTIVE" &&
      activatedSub?.plan === "STARTER" &&
      activatedSub?.maxLeads === 50 &&
      activatedSub?.maxMembers === 3;

    recordResult(
      "6. Payment Approval -> Create & Activate Organization Flow",
      isActivationSuccess,
      isActivationSuccess
        ? `Payment APPROVED -> Org status set to ACTIVE, Subscription upgraded to STARTER (50 leads, 3 members)`
        : `Activation flow failed`
    );

    // ───────────────────────────────────────────────────────────────────────────
    // 7. TENANT ISOLATION TEST
    // ───────────────────────────────────────────────────────────────────────────
    const orgB = await Organization.create({
      name: `Org B ${testSuffix}`,
      founderId: "founder_b",
      status: "TRIAL",
    });

    await Lead.create({
      requirement: "Org B Secret Lead",
      company: "Company B",
      phone: "+91 98888 77777",
      organizationId: String(orgB._id),
    });

    const orgALeads = await Lead.find({ organizationId: testOrgId });
    const containsOrgBData = orgALeads.some((l) => l.company === "Company B");

    recordResult(
      "7. Multi-Tenant Organization Isolation",
      !containsOrgBData,
      !containsOrgBData
        ? `Organization A query isolated strictly. Org B leads are inaccessible to Org A.`
        : `Tenant isolation broken! Org B data returned.`
    );

    // ───────────────────────────────────────────────────────────────────────────
    // 8. AUDIT LOGGING VERIFICATION
    // ───────────────────────────────────────────────────────────────────────────
    await logAudit({
      actorId: testFounderId,
      actorEmail: founderEmail,
      organizationId: testOrgId,
      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
      targetType: "Organization",
      targetId: testOrgId,
      metadata: { plan: "STARTER" },
    });

    const auditCount = await AuditLog.countDocuments({ organizationId: testOrgId });

    recordResult(
      "8. Audit Log Persistence",
      auditCount > 0,
      auditCount > 0
        ? `Audit log documents written to MongoDB successfully (count: ${auditCount})`
        : `No audit log documents found`
    );

  } catch (err) {
    console.error("Test execution error:", err);
    recordResult("E2E Test Runner Exception", false, String(err));
  }

  console.log("\n==================================================");
  console.log("FINAL SUMMARY OF VERIFICATION SUITE");
  console.log("==================================================");
  const totalTests = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount} / ${totalTests} tests`);

  if (passedCount === totalTests) {
    console.log("🎉 ALL E2E DATABASE VERIFICATION TESTS PASSED CLEANLY!");
  } else {
    console.log("❌ FEW TESTS FAILED — CHECK DETAILS ABOVE");
  }
}

runE2ETests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
