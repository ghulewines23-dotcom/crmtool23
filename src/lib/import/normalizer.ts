import type { MappedRow } from "./column-mapper";

export function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, "");

  // Handle +91 prefix variations
  if (normalized.startsWith("+91") && normalized.length === 13) {
    return normalized;
  }
  if (normalized.startsWith("91") && normalized.length === 12) {
    return "+" + normalized;
  }
  if (normalized.startsWith("0") && normalized.length === 11) {
    return "+91" + normalized.slice(1);
  }
  // 10 digits → Indian number
  if (normalized.length === 10 && !normalized.startsWith("+")) {
    return "+91" + normalized;
  }
  // Already has + prefix
  if (normalized.startsWith("+")) {
    return normalized;
  }

  return normalized;
}

export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.toLowerCase().trim().replace(/\s+/g, "");
}

export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeCompany(company: string): string {
  if (!company) return "";
  return company.trim().replace(/\s+/g, " ");
}

export function normalizeSource(source: string): string {
  if (!source) return "";
  return source.trim();
}

export function normalizeLead(lead: MappedRow): MappedRow {
  return {
    ...lead,
    name: normalizeName(lead.name),
    phone: normalizePhone(lead.phone),
    email: normalizeEmail(lead.email),
    company: normalizeCompany(lead.company),
    source: normalizeSource(lead.source),
    requirement: lead.requirement?.trim() || "",
    notes: lead.notes?.trim() || "",
    website: lead.website?.trim() || "",
    location: lead.location?.trim() || "",
    originalData: lead.originalData || {},
  };
}
