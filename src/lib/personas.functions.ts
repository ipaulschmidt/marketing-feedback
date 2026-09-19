import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson, str, strArray, type InputPart } from "./ai.server";
import { extractFile, type ExtractedFile } from "./extract.server";
import type { ParseReport, PersonaStructured } from "./persona-schema";

export type UploadedFileInput = { fileName: string; mimeType: string; base64: string };

type DraftInput = {
  sparktoroText: string;
  sparktoroFiles: UploadedFileInput[];
  voiceText: string;
  voiceFiles: UploadedFileInput[];
};

const PERSONA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "personaName",
    "roleAndDemographics",
    "mediaDiet",
    "interestsAndAffinities",
    "customerVoiceHighlights",
    "likelyVocabularyAndTone",
    "whatGoodAlreadyLooksLike",
    "skepticismProfile",
    "summary",
    "dataProvenance",
  ],
  properties: {
    personaName: str,
    roleAndDemographics: str,
    mediaDiet: strArray,
    interestsAndAffinities: strArray,
    customerVoiceHighlights: strArray,
    likelyVocabularyAndTone: str,
    whatGoodAlreadyLooksLike: str,
    skepticismProfile: str,
    summary: str,
    dataProvenance: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "source", "note"],
        properties: {
          field: str,
          source: str,
          note: str,
        },
      },
    },
  },
};

const SYNTHESIS_INSTRUCTIONS = `You turn raw audience-intelligence exports into a single, specific, grounded audience persona.

Rules:
- Use ONLY the supplied data. Never invent websites, podcasts, accounts, quotes or demographics that do not appear in it.
- The SparkToro export is spread across multiple sheets (websites, podcasts, social accounts, subreddits, hashtags, YouTube, demographics). Draw mediaDiet and interestsAndAffinities from ACROSS ALL sheets, naming specific entities, not categories.
- customerVoiceHighlights must be real quotes or close paraphrases from the customer voice data. If no customer voice data was supplied, return an empty array. NEVER fabricate quotes.
- likelyVocabularyAndTone: when customer voice data exists, weight that real language far more heavily than anything inferred from the media diet.
- skepticismProfile: be blunt about how time-poor, jaded and ad-blind this person likely is.
- whatGoodAlreadyLooksLike: what high-quality work in this category already looks like to someone who consumes this media diet daily.
- summary: one or two sentences, plain language, for a list view.
- dataProvenance: one entry per field above. source must be exactly "SparkToro export (<sheet name>)", "customer voice import", or "inference". Be honest — if a field is mostly extrapolation, say "inference".`;

function toParts(text: string, files: ExtractedFile[]): InputPart[] {
  const parts: InputPart[] = [{ type: "input_text", text }];
  for (const file of files) {
    if (file.pdfDataUrl) {
      parts.push({ type: "input_file", filename: file.fileName, file_data: file.pdfDataUrl });
    }
  }
  return parts;
}

export const buildPersonaDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DraftInput) => data)
  .handler(async ({ data, context }) => {
    const sparktoroFiles = data.sparktoroFiles.map(extractFile);
    const voiceFiles = data.voiceFiles.map(extractFile);

    if (!data.sparktoroText.trim() && sparktoroFiles.length === 0) {
      throw new Error("Add a SparkToro export file or paste a SparkToro summary first.");
    }

    const sparktoroPayload = [
      data.sparktoroText.trim() ? `## PASTED SPARKTORO SUMMARY\n${data.sparktoroText.trim()}` : "",
      ...sparktoroFiles.map((f) => f.text),
    ]
      .filter(Boolean)
      .join("\n\n");

    const voicePayload = [
      data.voiceText.trim() ? `## PASTED CUSTOMER VOICE\n${data.voiceText.trim()}` : "",
      ...voiceFiles.map((f) => f.text),
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = `=== SPARKTORO AUDIENCE DATA ===\n${sparktoroPayload}\n\n=== CUSTOMER VOICE DATA ===\n${
      voicePayload || "(none provided — leave customerVoiceHighlights empty and do not invent quotes)"
    }`;

    const persona = await aiJson<PersonaStructured>({
      instructions: SYNTHESIS_INSTRUCTIONS,
      schemaName: "audience_persona",
      schema: PERSONA_SCHEMA,
      messages: [{ role: "user", content: toParts(prompt, [...sparktoroFiles, ...voiceFiles]) }],
    });

    // Store uploaded source files under the user's own folder.
    const uploaded: { sparktoro: string | null; voice: string[] } = { sparktoro: null, voice: [] };
    const put = async (file: UploadedFileInput, folder: string) => {
      const path = `${context.userId}/${folder}/${Date.now()}-${file.fileName.replace(/[^\w.\-]/g, "_")}`;
      const binary = atob(file.base64.includes(",") ? file.base64.split(",")[1]! : file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
      const { error } = await context.supabase.storage
        .from("uploads")
        .upload(path, bytes, { contentType: file.mimeType || "application/octet-stream" });
      if (error) {
        console.error("[upload]", error.message);
        return null;
      }
      return path;
    };

    if (data.sparktoroFiles[0]) uploaded.sparktoro = await put(data.sparktoroFiles[0], "sparktoro");
    for (const file of data.voiceFiles) {
      const path = await put(file, "customer-voice");
      if (path) uploaded.voice.push(path);
    }

    const parseReport: ParseReport = {
      sparktoro: sparktoroFiles.map((f) => ({
        fileName: f.fileName,
        sheets: f.sheets.map((s) => ({ sheet: s.sheet, rows: s.rows })),
      })),
      sparktoroPastedText: Boolean(data.sparktoroText.trim()),
      customerVoice: voiceFiles.map((f) => ({
        fileName: f.fileName,
        kind: f.kind,
        sheets: f.sheets.map((s) => ({ sheet: s.sheet, rows: s.rows })),
      })),
      customerVoicePastedText: Boolean(data.voiceText.trim()),
    };

    return {
      persona,
      parseReport,
      artifacts: {
        sparktoroPath: uploaded.sparktoro,
        voicePaths: uploaded.voice,
        sparktoroSheets: sparktoroFiles.map((f) => ({ fileName: f.fileName, sheets: f.sheets })),
        voiceParsed: voiceFiles.map((f) => ({ fileName: f.fileName, kind: f.kind, text: f.text.slice(0, 20000) })),
        sparktoroRawText: data.sparktoroText,
        voiceRawText: data.voiceText,
      },
    };
  });
