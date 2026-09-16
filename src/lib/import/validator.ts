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

  // All rows are accepted as valid
  return {
    isValid: true,
    errors: [],
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
