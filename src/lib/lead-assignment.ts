import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Lead from "@/models/Lead";

export interface AssignedSalesperson {
  id: string;
  name: string;
}

/**
 * Reusable server-side service to automatically assign a lead to an active SALES_PERSON
 * in the specified organization using a least-loaded algorithm with round-robin tie breaking.
 */
export async function assignLeadToSalesPerson(
  organizationId: string
): Promise<AssignedSalesperson | null> {
  await connectDB();

  // Find all active salespeople in the organization
  const salespeople = await TeamMember.find({
    organizationId,
    role: "SALES_PERSON",
    status: "active",
  })
    .select("_id name")
    .lean();

  if (!salespeople || salespeople.length === 0) {
    return null;
  }

  if (salespeople.length === 1) {
    return {
      id: String(salespeople[0]._id),
      name: salespeople[0].name,
    };
  }

  // Count assigned leads per salesperson in this organization
  const salespersonIds = salespeople.map((s) => String(s._id));
  const leadCounts = await Lead.aggregate([
    {
      $match: {
        organizationId,
        assignedTo: { $in: salespersonIds },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map<string, number>();
  salespersonIds.forEach((id) => countMap.set(id, 0));
  leadCounts.forEach((item) => {
    countMap.set(String(item._id), item.count);
  });

  // Find the salesperson with the minimum lead count
  let minCount = Infinity;
  const candidates: { id: string; name: string }[] = [];

  for (const s of salespeople) {
    const idStr = String(s._id);
    const count = countMap.get(idStr) || 0;
    if (count < minCount) {
      minCount = count;
      candidates.length = 0;
      candidates.push({ id: idStr, name: s.name });
    } else if (count === minCount) {
      candidates.push({ id: idStr, name: s.name });
    }
  }

  // Round-robin selection among candidate ties using timestamp or random selection
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected;
}
