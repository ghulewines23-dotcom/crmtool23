/**
 * create-serene-owner.ts
 *
 * Creates or finds the global SERENE_OWNER account.
 * Run with: npx tsx scripts/create-serene-owner.ts
 *
 * This script must be run once during initial setup.
 * The owner must not belong to a customer organization.
 *
 * IMPORTANT: The password is read from OWNER_PASSWORD env var.
 * Set it before running: set OWNER_PASSWORD=your_password && npx tsx scripts/create-serene-owner.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "";
const OWNER_EMAIL = "ayushcodes30@gmail.com";
const OWNER_NAME = "Serene Owner";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "";

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI environment variable is not set.");
  process.exit(1);
}

if (!OWNER_PASSWORD) {
  console.error("Error: OWNER_PASSWORD environment variable is not set.");
  console.error("Run: set OWNER_PASSWORD=your_password && npx tsx scripts/create-serene-owner.ts");
  process.exit(1);
}

if (OWNER_PASSWORD.length < 8) {
  console.error("Error: OWNER_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const TeamMemberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true, trim: true, unique: true },
  phone: { type: String, default: "" },
  role: {
    type: String,
    enum: ["SERENE_OWNER", "FOUNDER", "ADMIN", "SALES_PERSON"],
    required: true,
  },
  avatar: { type: String, default: "" },
  activeLeads: { type: Number, default: 0 },
  activeTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  projects: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "inactive", "invited"],
    default: "active",
  },
  organizationId: { type: String, default: "" },
  passwordHash: { type: String, default: "" },
  activeSessionId: { type: String, default: "" },
}, { timestamps: true });

const TeamMember = mongoose.models.TeamMember ||
  mongoose.model("TeamMember", TeamMemberSchema);

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);

    // Check if SERENE_OWNER already exists
    const existing = await TeamMember.findOne({ email: OWNER_EMAIL }).lean();

    if (existing) {
      if (existing.role === "SERENE_OWNER") {
        console.log(`SERENE_OWNER account already exists: ${OWNER_EMAIL}`);
        console.log(`  User ID: ${existing._id}`);
        console.log(`  Role: ${existing.role}`);
        console.log(`  Organization ID: ${existing.organizationId || "(none)"}`);
        console.log(`  Status: ${existing.status}`);

        // Update password hash
        await TeamMember.findByIdAndUpdate(existing._id, { passwordHash });
        console.log(`  Password hash updated.`);
      } else {
        console.log(`User ${OWNER_EMAIL} exists with role ${existing.role}. Updating to SERENE_OWNER...`);
        await TeamMember.findByIdAndUpdate(existing._id, {
          role: "SERENE_OWNER",
          organizationId: "",
          status: "active",
          passwordHash,
        });
        console.log("Updated to SERENE_OWNER successfully.");
      }
    } else {
      // Create the SERENE_OWNER account
      const user = await TeamMember.create({
        name: OWNER_NAME,
        email: OWNER_EMAIL,
        phone: "",
        role: "SERENE_OWNER",
        avatar: "SO",
        status: "active",
        organizationId: "",
        passwordHash,
        activeSessionId: "",
      });

      console.log("SERENE_OWNER account created successfully:");
      console.log(`  Email: ${OWNER_EMAIL}`);
      console.log(`  User ID: ${user._id}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Organization ID: (none)`);
    }

    // Also check for any old PLATFORM_OWNER accounts and migrate them
    const oldOwner = await TeamMember.findOne({
      email: OWNER_EMAIL,
      role: { $ne: "SERENE_OWNER" },
    });

    if (oldOwner) {
      console.log(`\nMigrating old role ${oldOwner.role} to SERENE_OWNER...`);
      await TeamMember.findByIdAndUpdate(oldOwner._id, {
        role: "SERENE_OWNER",
        organizationId: "",
      });
      console.log("Migration complete.");
    }

    console.log("\nDone.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
