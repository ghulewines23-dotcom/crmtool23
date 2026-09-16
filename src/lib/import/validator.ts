import type { MappedRow } from "./column-mapper";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{10,15}$/;

export function validateLead(lead: MappedRow, rowIndex: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const hasRequirement = lead.requirement && lead.requirement.trim() !== "";
  const hasPhone = lead.phone && lead.phone.trim() !== "";
  const hasCompany = lead.company && lead.company.trim() !== "";

  // A lead is valid if it has requirement + company + phone
  const hasAllRequiredFields = hasRequirement && hasPhone && hasCompany;

  if (!hasAllRequiredFields) {
    const missing: string[] = [];
    if (!hasRequirement) missing.push("requirement");
    if (!hasCompany) missing.push("company");
    if (!hasPhone) missing.push("phone");
    errors.push({
      field: "general",
      message: `Row ${rowIndex + 1}: Missing required fields: ${missing.join(", ")}`,
    });
  }

  // Phone format warning (not error)
  if (hasPhone && !PHONE_REGEX.test(lead.phone.replace(/[\s\-()]/g, ""))) {
    warnings.push({
      field: "phone",
      message: `Row ${rowIndex + 1}: Phone number format may be invalid`,
    });
  }

  // Email format warning (not error)
  const hasEmail = lead.email && lead.email.trim() !== "";
  if (hasEmail && !EMAIL_REGEX.test(lead.email)) {
    warnings.push({
      field: "email",
      message: `Row ${rowIndex + 1}: Email format appears invalid`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateLeads(leads: MappedRow[]): {
  valid: MappedRow[];
  invalid: { lead: MappedRow; index: number; errors: ValidationError[] }[];
  warnings: { lead: MappedRow; index: number; warnings: ValidationError[] }[];
} {
  const valid: MappedRow[] = [];
  const invalid: { lead: MappedRow; index: number; errors: ValidationError[] }[] = [];
  const warnings: { lead: MappedRow; index: number; warnings: ValidationError[] }[] = [];

  leads.forEach((lead, index) => {
    const result = validateLead(lead, index);

    if (result.isValid) {
      valid.push(lead);
      if (result.warnings.length > 0) {
        warnings.push({ lead, index, warnings: result.warnings });
      }
    } else {
      invalid.push({ lead, index, errors: result.errors });
    }
  });

  return { valid, invalid, warnings };
}
