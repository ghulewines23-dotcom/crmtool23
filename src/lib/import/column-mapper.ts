// ── Canonical fields and their aliases ──

const COLUMN_ALIASES: Record<string, string[]> = {
  name: [
    "name", "full name", "fullname", "customer name", "lead name",
    "contact name", "person", "client name",
  ],
  phone: [
    "phone", "phone number", "mobile", "mobile number", "contact",
    "contact number", "tel", "telephone", "cell", "whatsapp", "phone no",
    "phone no.", "mobile no", "mobile no.", "contact no", "contact no.",
  ],
  email: [
    "email", "email address", "e-mail", "mail", "email id", "emailid",
    "e mail", "email addr",
  ],
  company: [
    "company", "business", "company name", "business name",
    "organization", "org", "firm", "organisation",
  ],
  source: [
    "source", "lead source", "how did they find us",
    "referral source", "channel", "origin",
  ],
  sourceUrl: [
    "source link", "google maps link", "google maps", "maps link",
    "source url", "url", "link",
  ],
  requirement: [
    "requirement", "requirements", "need", "needs", "inquiry", "enquiry",
    "service required", "service", "description", "details",
    "what they need", "request", "feedback", "comment", "comments",
  ],
  notes: [
    "notes", "remark", "remarks", "additional info",
    "additional information", "memo", "note", "message",
  ],
  website: [
    "website", "web", "site", "website url", "company website",
  ],
  location: [
    "location", "city", "area", "address", "region", "place", "state",
    "locality", "district", "pincode", "pin code", "zip",
  ],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MappedRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  source: string;
  sourceUrl: string;
  requirement: string;
  notes: string;
  website: string;
  location: string;
  originalData: Record<string, string>;
}

function findMappedField(normalizedHeader: string): string | null {
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalizedHeader)) {
      return field;
    }
  }
  return null;
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function inferSourceFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("google.com/maps") || lower.includes("goo.gl/maps") || lower.includes("maps.app.goo")) {
    return "Google Maps";
  }
  if (lower.includes("facebook.com") || lower.includes("fb.com") || lower.includes("fb.me")) {
    return "Facebook";
  }
  if (lower.includes("instagram.com")) {
    return "Instagram";
  }
  if (lower.includes("linkedin.com")) {
    return "LinkedIn";
  }
  if (lower.includes("twitter.com") || lower.includes("x.com")) {
    return "Twitter";
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "YouTube";
  }
  if (lower.includes("justdial.com")) {
    return "JustDial";
  }
  if (lower.includes("indiamart.com")) {
    return "IndiaMART";
  }
  if (lower.includes("google.com")) {
    return "Google";
  }
  return "";
}

export function mapColumns(
  headers: string[]
): { mapping: Record<string, string>; unmappedHeaders: string[] } {
  const mapping: Record<string, string> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    const field = findMappedField(normalized);
    if (field) {
      mapping[header] = field;
    } else {
      unmappedHeaders.push(header);
    }
  }

  return { mapping, unmappedHeaders };
}

export function mapRowToCanonical(
  row: Record<string, string | number | boolean | null>,
  mapping: Record<string, string>
): MappedRow {
  const canonical: MappedRow = {
    name: "",
    phone: "",
    email: "",
    company: "",
    source: "",
    sourceUrl: "",
    requirement: "",
    notes: "",
    website: "",
    location: "",
    originalData: {},
  };

  for (const [originalHeader, canonicalField] of Object.entries(mapping)) {
    const value = row[originalHeader];
    if (value !== null && value !== undefined && value !== "") {
      const str = String(value).trim();
      const cf = canonicalField as keyof Omit<MappedRow, "originalData">;
      canonical[cf] = str;
    }
  }

  // If sourceUrl was mapped but source is empty, infer source label from URL
  if (canonical.sourceUrl && !canonical.source) {
    canonical.source = inferSourceFromUrl(canonical.sourceUrl);
  }

  // If source was mapped but contains a URL, move it to sourceUrl
  if (canonical.source && isUrl(canonical.source) && !canonical.sourceUrl) {
    canonical.sourceUrl = canonical.source;
    canonical.source = inferSourceFromUrl(canonical.source);
  }

  // Preserve ALL original data
  for (const [key, value] of Object.entries(row)) {
    canonical.originalData[key] =
      value !== null && value !== undefined ? String(value).trim() : "";
  }

  return canonical;
}
