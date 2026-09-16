import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  headerRowIndex: number;
  rawAllRows: (string | number | boolean | null)[][];
}

// ── Known header keywords (lowercase, stripped of punctuation) ──
const HEADER_KEYWORDS = new Set([
  "name", "full name", "fullname", "customer name", "lead name", "contact name",
  "person", "client name", "business name", "company name",
  "phone", "phone number", "mobile", "mobile number", "contact", "contact number",
  "tel", "telephone", "cell", "whatsapp",
  "email", "email address", "e-mail", "mail", "email id",
  "company", "business", "organization", "org", "firm",
  "source", "lead source", "source link", "how did they find us",
  "referral source", "channel", "origin",
  "message", "inquiry", "enquiry", "requirement", "requirements",
  "query", "description", "details", "what they need", "request", "feedback",
  "notes", "remark", "remarks", "comments", "comment", "note",
  "additional info", "memo",
  "website", "web", "url", "site", "website url", "company website",
  "location", "city", "area", "address", "region", "place", "state", "locality",
  "date", "time", "status", "priority", "assigned", "assigned to",
]);

function stripToAlphaLower(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function isNonEmptyString(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s.length > 0;
}

/**
 * Score a row: how likely is it to be a header row?
 * Higher score = more likely header.
 */
function scoreRowAsHeader(cells: (string | number | boolean | null)[]): number {
  if (cells.length === 0) return -1;

  let score = 0;
  let nonEmptyCells = 0;
  let keywordMatches = 0;

  for (const cell of cells) {
    if (!isNonEmptyString(cell)) continue;
    nonEmptyCells++;

    const normalized = stripToAlphaLower(cell);
    if (normalized.length === 0) continue;

    // Exact or partial match against known header keywords
    if (HEADER_KEYWORDS.has(normalized)) {
      keywordMatches++;
      score += 10;
    } else {
      // Check if any keyword is a substring of this cell or vice versa
      let partialMatch = false;
      for (const kw of HEADER_KEYWORDS) {
        if (normalized.includes(kw) || kw.includes(normalized)) {
          partialMatch = true;
          break;
        }
      }
      if (partialMatch) {
        keywordMatches++;
        score += 5;
      }
    }
  }

  // Penalize rows with too few non-empty cells
  if (nonEmptyCells < 2) return -1;

  // Penalize rows where very few cells matched keywords
  const matchRatio = nonEmptyCells > 0 ? keywordMatches / nonEmptyCells : 0;

  // If no keywords matched at all and it's a single long string, likely a title
  if (keywordMatches === 0 && nonEmptyCells === 1) return -1;
  if (keywordMatches === 0 && matchRatio === 0) return 0;

  // Bonus: more non-empty cells with keyword matches = stronger header signal
  score += nonEmptyCells * 2;
  score += Math.round(matchRatio * 20);

  // Bonus for having many keyword matches
  if (keywordMatches >= 3) score += 15;
  if (keywordMatches >= 5) score += 10;

  return score;
}

/**
 * Detect which row in the sheet is the header row.
 * Scans the first MAX_SCAN_ROWS rows and picks the best candidate.
 */
function detectHeaderRow(
  allRows: (string | number | boolean | null)[][]
): { headerRowIndex: number; confidence: "high" | "medium" | "low" } {
  const MAX_SCAN_ROWS = Math.min(allRows.length, 10);

  let bestIndex = 0;
  let bestScore = -1;
  let secondBestScore = -1;

  for (let i = 0; i < MAX_SCAN_ROWS; i++) {
    const row = allRows[i];
    const score = scoreRowAsHeader(row);

    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestIndex = i;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (bestScore >= 15 && bestScore > secondBestScore * 1.5) {
    confidence = "high";
  } else if (bestScore >= 5) {
    confidence = "medium";
  }

  return { headerRowIndex: bestIndex, confidence };
}

function parseCSVWithAutoHeader(text: string): ParseResult {
  const allLines = text.split(/\r?\n/).filter((line) => line.trim());
  if (allLines.length < 1) {
    throw new Error("File is empty");
  }

  // Parse all lines into cell arrays
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawRows: (string | number | boolean | null)[][] = allLines.map((line) =>
    parseCSVLine(line).map((cell) => cell)
  );

  // Detect header row
  const { headerRowIndex, confidence } = detectHeaderRow(rawRows);
  const headers = rawRows[headerRowIndex].map(cellToString).filter((h) => h.length > 0);

  if (headers.length === 0) {
    throw new Error(
      "Could not confidently detect column headers. The file may not contain recognizable column names."
    );
  }

  // Build data rows from rows AFTER the header
  const rows: ParsedRow[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    // Skip completely empty rows
    const nonEmpty = cells.filter(isNonEmptyString);
    if (nonEmpty.length === 0) continue;

    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      const val = cells[idx];
      row[h] = val !== undefined && val !== null ? val : "";
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    headerRowIndex,
    rawAllRows: rawRows,
  };
}

function parseExcelWithAutoHeader(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in Excel file");

  const sheet = workbook.Sheets[sheetName];

  // Read as raw 2D array (header: 1 mode) so we can detect the real header row
  const rawRows: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json<
    (string | number | boolean | null)[]
  >(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (rawRows.length === 0) throw new Error("Excel file is empty");

  // Detect header row
  const { headerRowIndex, confidence } = detectHeaderRow(rawRows);
  const headers = rawRows[headerRowIndex].map(cellToString).filter((h) => h.length > 0);

  if (headers.length === 0) {
    throw new Error(
      "Could not confidently detect column headers. The file may not contain recognizable column names."
    );
  }

  // Build data rows from rows AFTER the header
  const rows: ParsedRow[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    // Skip completely empty rows
    const nonEmpty = cells.filter(isNonEmptyString);
    if (nonEmpty.length === 0) continue;

    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      const val = cells[idx];
      row[h] = val !== undefined && val !== null ? val : "";
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    headerRowIndex,
    rawAllRows: rawRows,
  };
}

export function parseFile(
  buffer: Buffer,
  filename: string
): ParseResult {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "csv") {
    return parseCSVWithAutoHeader(buffer.toString("utf-8"));
  }

  if (ext === "xlsx" || ext === "xls") {
    return parseExcelWithAutoHeader(buffer);
  }

  throw new Error(
    `Unsupported file type: .${ext}. Only .csv, .xlsx, and .xls are supported.`
  );
}
