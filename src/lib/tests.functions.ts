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
  designs: { fileName: string; mimeType: string; base64: string }[];
  references: { file: { fileName: string; mimeType: string; base64: string }; note: string }[];
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
    "executiveSummary",
    "blinkTest",
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
    "buyerJourneyReactions",
    "visualCallouts",
  ],
  properties: {
    executiveSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallVerdict", "oneLineSummary"],
      properties: { overallVerdict: str, oneLineSummary: str },
    },
    gutReaction: str,
    blinkTest: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "whatRegistersInWindow", "reasoning"],
      properties: {
        verdict: {
          type: "string",
          enum: ["walks by / scrolls past", "brief pause, keeps moving", "stops to look closer"],
        },
        whatRegistersInWindow: str,
        reasoning: str,
      },
    },
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
    buyerJourneyReactions: {
      type: "object",
      additionalProperties: false,
      required: ["awareness", "consideration", "decision", "potentialPartner"],
      properties: { awareness: str, consideration: str, decision: str, potentialPartner: str },
    },
    visualCallouts: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "designImageNumber", "label", "approxX", "approxY", "note"],
        properties: {
          number: { type: "integer", minimum: 1, maximum: 5 },
          designImageNumber: { type: "integer", minimum: 1 },
          label: str,
          approxX: { type: "number", minimum: 0, maximum: 100 },
          approxY: { type: "number", minimum: 0, maximum: 100 },
          note: str,
        },
      },
    },
  },
};

function buildSystemPrompt(args: {
  personaJson: string;
  designType: string;
  goal: string;
  channelContext: string;
  referenceNotes: string[];
}): string {
  const designType = args.designType || "marketing design";
  const referenceBlock = args.referenceNotes.length > 0
    ? `Reference examples already in the market have also been provided${args.referenceNotes.some(Boolean) ? ` with these notes: ${args.referenceNotes.map((note, index) => `Reference Example ${String.fromCharCode(65 + index)}: ${note || "no note"}`).join("; ")}` : ""}. Use them as concrete points of comparison, not just background. Name specific similarities and differences between the design being tested and these references when forming your genericVsDistinct judgment, rather than relying only on inferred category norms.\n\n`
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

Apply a blink test: in marketing this is the 3-5 second window in which a person decides whether something is worth a second look or a pass. Judge only what would actually register for this persona in that narrow window, not what they'd notice on a closer read. Most people encountering this in the real context described only get this window.

In addition to your primary reaction as the persona described, generate a short, distinct first-person reaction (2-3 sentences, in voice) for each buyer's journey stage: awareness (doesn't yet know they have the specific problem, or is just starting to notice it); consideration (knows they have the problem and is actively comparing approaches or vendors); decision (close to choosing and evaluating specific vendors or partners); and potentialPartner (a possible referral source or complementary partner sizing this up as a partner, not a buyer). Each reaction must reflect what that stage actually cares about and notices, not restate the main reaction.

After completing the full analysis, write a one-sentence executive summary that a busy leader reading only this line would still walk away with the right takeaway, and choose the overallVerdict label honestly, not diplomatically. A weak design should get a label that says so.

Identify 3 to 5 of the most important points across the design images and assign each to its Design Photo number. Estimate its approximate position as a percentage of image width and height from the top-left corner. These are best-effort visual estimates, not pixel-precise coordinates. Limit them to first attention, second attention, the biggest friction point, and any key credibility or CTA element.

Ratings are 1-5 where 1 means it fails this persona completely and 5 is reserved for work that genuinely cuts through. Most real-world work lands at 2 or 3; do not inflate.

Return ONLY valid JSON matching the provided schema.`;
}

function filePart(file: { fileName: string; mimeType: string; base64: string }, label: string): InputPart[] {
  const split = file.base64.split(",");
  const raw = file.base64.includes(",") ? (split[1] ?? "") : file.base64;
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

    if (data.designs.length === 0) throw new Error("Upload at least one design image.");

    const content: InputPart[] = [
      ...data.designs.flatMap((design, index) => filePart(design, `DESIGN PHOTO ${index + 1}:`)),
      ...data.references.flatMap((reference, index) =>
        filePart(
          reference.file,
          `REFERENCE EXAMPLE ${String.fromCharCode(65 + index)} (already in the market)${reference.note ? ` — ${reference.note}` : ""}:`,
        ),
      ),
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
        referenceNotes: data.references.map((reference) => reference.note),
      }),
      schemaName: "design_feedback",
      schema: FEEDBACK_SCHEMA,
      messages: [{ role: "user", content }],
    });

    const put = async (file: { fileName: string; mimeType: string; base64: string }, folder: string) => {
      const path = `${context.userId}/${folder}/${Date.now()}-${file.fileName.replace(/[^\w.\-]/g, "_")}`;
      const split = file.base64.split(",");
      const raw = file.base64.includes(",") ? (split[1] ?? "") : file.base64;
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const { error } = await context.supabase.storage
        .from("uploads")
        .upload(path, bytes, { contentType: file.mimeType || "application/octet-stream" });
      if (error) {
        console.error("[upload]", error.message);
        return null;
      }
      return path;
    };

    const designPaths = (await Promise.all(data.designs.map((design) => put(design, "designs")))).filter(
      (path): path is string => Boolean(path),
    );
    const referenceImages = (
      await Promise.all(
        data.references.map(async (reference) => ({
          url: await put(reference.file, "references"),
          note: reference.note,
        })),
      )
    ).filter((reference): reference is { url: string; note: string } => Boolean(reference.url));

    const { data: inserted, error: insertError } = await context.supabase
      .from("design_tests")
      .insert({
        user_id: context.userId,
        persona_id: data.personaId,
        design_image_urls: designPaths,
        design_label: data.designLabel || null,
        design_type: data.designType || null,
        goal: data.goal || null,
        channel_context: data.channelContext || null,
        reference_example_images: referenceImages as unknown as Json,
        feedback_result: feedback as unknown as Json,
      })
      .select("id")
      .single();

    if (insertError || !inserted) throw new Error("The feedback was generated but could not be saved.");

    return { testId: inserted.id };
  });
