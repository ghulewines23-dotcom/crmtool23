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
      phone: lead.phone.trim(),
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
      email: lead.email.trim().toLowerCase(),
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

  const seenPhonesInSheet = new Map<string, number>();
  const seenEmailsInSheet = new Map<string, number>();

  // Step 1: Detect duplicate rows WITHIN the sheet itself
  leads.forEach((l, i) => {
    const cleanPhone = l.phone ? l.phone.trim() : "";
    const cleanEmail = l.email ? l.email.trim().toLowerCase() : "";

    if (cleanPhone) {
      if (seenPhonesInSheet.has(cleanPhone)) {
        results.set(i, {
          isDuplicate: true,
          duplicateType: "phone",
          existingLeadId: null,
        });
      } else {
        seenPhonesInSheet.set(cleanPhone, i);
      }
    }

    if (cleanEmail && !results.has(i)) {
      if (seenEmailsInSheet.has(cleanEmail)) {
        results.set(i, {
          isDuplicate: true,
          duplicateType: "email",
          existingLeadId: null,
        });
      } else {
        seenEmailsInSheet.set(cleanEmail, i);
      }
    }
  });

  // Step 2: Check remaining non-duplicate leads against the MongoDB database
  const phonesToCheck = leads
    .map((l, i) => ({ phone: l.phone ? l.phone.trim() : "", index: i }))
    .filter((l) => l.phone !== "" && !results.has(l.index));

  const emailsToCheck = leads
    .map((l, i) => ({ email: l.email ? l.email.trim().toLowerCase() : "", index: i }))
    .filter((l) => l.email !== "" && !results.has(l.index));

  if (phonesToCheck.length > 0) {
    const phoneValues = Array.from(new Set(phonesToCheck.map((p) => p.phone)));
    const existingPhones = await Lead.find({
      phone: { $in: phoneValues },
      organizationId,
    })
      .select("phone _id")
      .lean();

    const phoneMap = new Map(
      existingPhones.map((p) => [p.phone, p._id.toString()])
    );

    for (const { phone, index } of phonesToCheck) {
      if (phoneMap.has(phone)) {
        results.set(index, {
          isDuplicate: true,
          duplicateType: "phone",
          existingLeadId: phoneMap.get(phone)!,
        });
      }
    }
  }

  if (emailsToCheck.length > 0) {
    const emailValues = Array.from(
      new Set(
        emailsToCheck
          .filter(({ index }) => !results.has(index))
          .map((e) => e.email)
      )
    );

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

      for (const { email, index } of emailsToCheck) {
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
