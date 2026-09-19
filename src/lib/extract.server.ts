// Server-only file text extraction. Reads EVERY sheet of a workbook.
import * as XLSX from "xlsx";
import { unzipSync, strFromU8 } from "fflate";

export type SheetSummary = { sheet: string; rows: number; columns: string[] };
export type ExtractedFile = {
  fileName: string;
  kind: "spreadsheet" | "text" | "docx" | "pdf" | "unknown";
  text: string;
  sheets: SheetSummary[];
  /** present for PDFs: passed to the model as an input_file */
  pdfDataUrl?: string;
};

const MAX_ROWS_PER_SHEET = 800;

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
  return bytes;
}

function extractSpreadsheet(fileName: string, bytes: Uint8Array): ExtractedFile {
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheets: SheetSummary[] = [];
  const blocks: string[] = [];

  // Iterate EVERY sheet in the workbook — SparkToro splits data across tabs.
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
    sheets.push({ sheet: sheetName, rows: rows.length, columns });

    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const lines = csv.split("\n").slice(0, MAX_ROWS_PER_SHEET);
    blocks.push(
      `### SHEET: "${sheetName}" (${rows.length} data rows${
        rows.length > MAX_ROWS_PER_SHEET ? `, first ${MAX_ROWS_PER_SHEET} shown` : ""
      })\n${lines.join("\n")}`,
    );
  }

  return {
    fileName,
    kind: "spreadsheet",
    text: `## FILE: ${fileName} (${sheets.length} sheets)\n${blocks.join("\n\n")}`,
    sheets,
  };
}

function extractDocx(fileName: string, bytes: Uint8Array): ExtractedFile {
  let text = "";
  try {
    const files = unzipSync(bytes);
    const doc = files["word/document.xml"];
    if (doc) {
      text = strFromU8(doc)
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  } catch {
    text = "";
  }
  return {
    fileName,
    kind: "docx",
    text: `## FILE: ${fileName}\n${text}`,
    sheets: [],
  };
}

export function extractFile(input: {
  fileName: string;
  mimeType: string;
  base64: string;
}): ExtractedFile {
  const name = input.fileName;
  const lower = name.toLowerCase();
  const bytes = base64ToBytes(input.base64);

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv") || lower.endsWith(".tsv")) {
    return extractSpreadsheet(name, bytes);
  }
  if (lower.endsWith(".docx")) return extractDocx(name, bytes);
  if (lower.endsWith(".pdf")) {
    return {
      fileName: name,
      kind: "pdf",
      text: `## FILE: ${name} (PDF — attached for the model to read directly)`,
      sheets: [],
      pdfDataUrl: `data:application/pdf;base64,${
        input.base64.includes(",") ? input.base64.slice(input.base64.indexOf(",") + 1) : input.base64
      }`,
    };
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".json")) {
    return {
      fileName: name,
      kind: "text",
      text: `## FILE: ${name}\n${new TextDecoder().decode(bytes)}`,
      sheets: [],
    };
  }
  return {
    fileName: name,
    kind: "unknown",
    text: `## FILE: ${name} (unsupported format — no text could be read)`,
    sheets: [],
  };
}
