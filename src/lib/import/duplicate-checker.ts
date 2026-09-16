import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import type { MappedRow } from "./column-mapper";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: "phone" | "email" | null;
  existingLeadId: string | null;
}

export async function checkDuplicate(
  lead: MappedRow,
  organizationId: string
): Promise<DuplicateCheckResult> {
  await connectDB();

  // Check by phone first (most reliable)
  if (lead.phone && lead.phone.trim() !== "") {
    const existingByPhone = await Lead.findOne({
      phone: lead.phone,
      organizationId,
    }).select("_id").lean();

    if (existingByPhone) {
      return {
        isDuplicate: true,
        duplicateType: "phone",
        existingLeadId: existingByPhone._id.toString(),
      };
    }
  }

  // Check by email if phone is not duplicate
  if (lead.email && lead.email.trim() !== "") {
    const existingByEmail = await Lead.findOne({
      email: lead.email,
      organizationId,
    }).select("_id").lean();

    if (existingByEmail) {
      return {
        isDuplicate: true,
        duplicateType: "email",
        existingLeadId: existingByEmail._id.toString(),
      };
    }
  }

  return {
    isDuplicate: false,
    duplicateType: null,
    existingLeadId: null,
  };
}

export async function checkDuplicatesBatch(
  leads: MappedRow[],
  organizationId: string
): Promise<Map<number, DuplicateCheckResult>> {
  await connectDB();
  const results = new Map<number, DuplicateCheckResult>();

  // Collect all phones and emails for batch lookup
  const phones = leads
    .map((l, i) => ({ phone: l.phone, index: i }))
    .filter((l) => l.phone && l.phone.trim() !== "");

  const emails = leads
    .map((l, i) => ({ email: l.email, index: i }))
    .filter((l) => l.email && l.email.trim() !== "");

  // Batch query for phones
  if (phones.length > 0) {
    const phoneValues = phones.map((p) => p.phone);
    const existingPhones = await Lead.find({
      phone: { $in: phoneValues },
      organizationId,
    })
      .select("phone _id")
      .lean();

    const phoneMap = new Map(
      existingPhones.map((p) => [p.phone, p._id.toString()])
    );

    for (const { phone, index } of phones) {
      if (phoneMap.has(phone)) {
        results.set(index, {
          isDuplicate: true,
          duplicateType: "phone",
          existingLeadId: phoneMap.get(phone)!,
        });
      }
    }
  }

  // Batch query for emails (only for non-phone duplicates)
  if (emails.length > 0) {
    const emailValues = emails
      .filter(({ index }) => !results.has(index))
      .map((e) => e.email);

    if (emailValues.length > 0) {
      const existingEmails = await Lead.find({
        email: { $in: emailValues },
        organizationId,
      })
        .select("email _id")
        .lean();

      const emailMap = new Map(
        existingEmails.map((e) => [e.email, e._id.toString()])
      );

      for (const { email, index } of emails) {
        if (!results.has(index) && emailMap.has(email)) {
          results.set(index, {
            isDuplicate: true,
            duplicateType: "email",
            existingLeadId: emailMap.get(email)!,
          });
        }
      }
    }
  }

  return results;
}
