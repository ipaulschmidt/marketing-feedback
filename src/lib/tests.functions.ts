import type { Json } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson, str, strArray, type InputPart } from "./ai.server";
import type { FeedbackResult, PersonaStructured } from "./persona-schema";

type RunTestInput = {
  personaId: string;
  designType: string;
  goal: string;
  channelContext: string;
  designLabel: string;
  referenceNote: string;
  design: { fileName: string; mimeType: string; base64: string };
  reference: { fileName: string; mimeType: string; base64: string } | null;
};

const rating = {
  type: "object",
  additionalProperties: false,
  required: ["rating", "reasoning"],
  properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, reasoning: str },
};

const FEEDBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "gutReaction",
    "messageClarity",
    "visualHierarchy",
    "credibilityAndTrust",
    "emotionalResonance",
    "genericVsDistinct",
    "predictedAction",
    "biggestFriction",
    "biggestOpportunity",
    "personaQuote",
    "confidenceNote",
  ],
  properties: {
    gutReaction: str,
    messageClarity: rating,
    visualHierarchy: rating,
    credibilityAndTrust: rating,
    emotionalResonance: rating,
    genericVsDistinct: str,
    predictedAction: str,
    biggestFriction: strArray,
    biggestOpportunity: str,
    personaQuote: str,
    confidenceNote: str,
  },
};

function buildSystemPrompt(args: {
  personaJson: string;
  designType: string;
  goal: string;
  channelContext: string;
  referenceProvided: boolean;
  referenceNote: string;
}): string {
  const designType = args.designType || "marketing design";
  const referenceBlock = args.referenceProvided
    ? `A reference example has also been provided: an actual comparable design already in the market${
        args.referenceNote ? `, described as: ${args.referenceNote}` : ""
      }. Use it as a concrete point of comparison, not just background. Name specific similarities and differences between the design being tested and this reference when forming your genericVsDistinct judgment, rather than relying only on inferred category norms.\n\n`
    : "";

  return `You are simulating a real, specific member of an audience segment, built from actual audience intelligence data and, where available, real customer voice data (not a generic reviewer, not a helpful assistant). Persona: ${args.personaJson}. You are looking at a ${designType} whose stated goal is: ${args.goal || "(not stated)"}. You will encounter it in this context: ${args.channelContext || "(not stated)"}.

${referenceBlock}Your job is to react exactly as this real person would in that moment, not as a design critic and not as an assistant trying to be encouraging or helpful. This person is busy, mildly skeptical, and has already seen many similar ${designType}s in their feed, inbox, or industry. Give an honest, unfiltered reaction, including if it is negative, boring, confusing, or something they would ignore entirely.

Rules:
- Do not soften criticism to be polite. Do not default to constructive positivity if the design does not earn it.
- Ground every reaction in the specific persona data provided: their actual media diet, real customer voice language (if available), and what "good" already looks like to them in this category.
- If a reference example was provided, explicitly compare against it. If not, judge genericness against the category norms implied by the persona's media diet, and say which is being used.
- If the design looks like everything else this persona already sees, say so directly and name what makes it indistinct.
- Never rate something as effective just because it is competently made. Competent is not the bar; cutting through this person's specific skepticism and attention scarcity is the bar.
- If you are genuinely uncertain how this persona would react to a specific element, say so rather than guessing confidently.

Ratings are 1-5 where 1 means it fails this persona completely and 5 is reserved for work that genuinely cuts through. Most real-world work lands at 2 or 3; do not inflate.

Return ONLY valid JSON matching the provided schema.`;
}

function filePart(file: { fileName: string; mimeType: string; base64: string }, label: string): InputPart[] {
  const raw = file.base64.includes(",") ? file.base64.split(",")[1]! : file.base64;
  const isPdf = file.mimeType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    return [
      { type: "input_text", text: label },
      { type: "input_file", filename: file.fileName, file_data: `data:application/pdf;base64,${raw}` },
    ];
  }
  const mime = file.mimeType && file.mimeType.startsWith("image/") ? file.mimeType : "image/png";
  return [
    { type: "input_text", text: label },
    { type: "input_image", image_url: `data:${mime};base64,${raw}` },
  ];
}

export const runDesignTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: RunTestInput) => data)
  .handler(async ({ data, context }) => {
    const { data: persona, error: personaError } = await context.supabase
      .from("personas")
      .select("id, name, structured_data")
      .eq("id", data.personaId)
      .single();
    if (personaError || !persona) throw new Error("That persona could not be found.");

    const structured = persona.structured_data as unknown as PersonaStructured;

    const content: InputPart[] = [
      ...filePart(data.design, "THE DESIGN BEING TESTED:"),
      ...(data.reference ? filePart(data.reference, "REFERENCE EXAMPLE (already in the market):") : []),
      {
        type: "input_text",
        text: "React now, as this persona. Be honest and specific. Return only the JSON.",
      },
    ];

    const feedback = await aiJson<FeedbackResult>({
      instructions: buildSystemPrompt({
        personaJson: JSON.stringify(structured),
        designType: data.designType,
        goal: data.goal,
        channelContext: data.channelContext,
        referenceProvided: Boolean(data.reference),
        referenceNote: data.referenceNote,
      }),
      schemaName: "design_feedback",
      schema: FEEDBACK_SCHEMA,
      messages: [{ role: "user", content }],
    });

    const put = async (file: { fileName: string; mimeType: string; base64: string }, folder: string) => {
      const path = `${context.userId}/${folder}/${Date.now()}-${file.fileName.replace(/[^\w.\-]/g, "_")}`;
      const raw = file.base64.includes(",") ? file.base64.split(",")[1]! : file.base64;
      const binary = atob(raw);
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

    const designPath = await put(data.design, "designs");
    const referencePath = data.reference ? await put(data.reference, "references") : null;

    const { data: inserted, error: insertError } = await context.supabase
      .from("design_tests")
      .insert({
        user_id: context.userId,
        persona_id: data.personaId,
        design_image_url: designPath,
        design_image_urls: designPath ? [designPath] : [],
        design_label: data.designLabel || null,
        design_type: data.designType || null,
        goal: data.goal || null,
        channel_context: data.channelContext || null,
        reference_example_image_url: referencePath,
        reference_example_note: data.referenceNote || null,
        feedback_result: feedback as unknown as Json,
      })
      .select("id")
      .single();

    if (insertError || !inserted) throw new Error("The feedback was generated but could not be saved.");

    return { testId: inserted.id };
  });
