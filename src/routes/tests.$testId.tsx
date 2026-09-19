import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, Minus, Printer, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AnnotatedDesign, BuyerJourney } from "@/components/ReportInteractions";
import { StoredImage } from "@/components/StoredImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DISCLAIMER,
  type FeedbackResult,
  type ReferenceExample,
} from "@/lib/persona-schema";

export const Route = createFileRoute("/tests/$testId")({
  head: () => ({
    meta: [
      { title: "Feedback report — Audience Gut Check" },
      {
        name: "description",
        content:
          "A directional, deliberately critical simulated reaction to your design from your audience persona.",
      },
      { property: "og:title", content: "Feedback report — Audience Gut Check" },
      {
        property: "og:description",
        content:
          "A directional, deliberately critical simulated reaction to your design from your audience persona.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((step) => (
        <span key={step} className={`h-2 w-6 rounded-sm ${step <= value ? "bg-primary" : "bg-muted"}`} />
      ))}
      <span className="ml-1 font-mono text-xs text-muted-foreground">{value}/5</span>
    </div>
  );
}

function ScoreBlock({ title, rating, reasoning }: { title: string; rating: number; reasoning: string }) {
  return (
    <div className="panel space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold">{title}</p>
        <Rating value={rating} />
      </div>
      <p className="text-sm text-muted-foreground">{reasoning}</p>
    </div>
  );
}

function GroundingBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <Badge
      variant={present ? "default" : "outline"}
      className={present ? "gap-1.5" : "gap-1.5 text-muted-foreground"}
    >
      {present ? <Check className="size-3" /> : <Minus className="size-3" />}
      {label}: {present ? "present" : "not present"}
    </Badge>
  );
}

function asText(feedback: FeedbackResult, personaName: string): string {
  const lines = [
    `Audience Gut Check — ${personaName}`,
    "",
    feedback.executiveSummary
      ? `EXECUTIVE VERDICT: ${feedback.executiveSummary.overallVerdict}\n${feedback.executiveSummary.oneLineSummary}`
      : "",
    `GUT REACTION: ${feedback.gutReaction}`,
    feedback.blinkTest
      ? `BLINK TEST: ${feedback.blinkTest.verdict}\nRegisters: ${feedback.blinkTest.whatRegistersInWindow}\n${feedback.blinkTest.reasoning}`
      : "",
    `PERSONA QUOTE: "${feedback.personaQuote}"`,
    "",
    `Message clarity (${feedback.messageClarity.rating}/5): ${feedback.messageClarity.reasoning}`,
    `Visual hierarchy (${feedback.visualHierarchy.rating}/5): ${feedback.visualHierarchy.reasoning}`,
    `Credibility & trust (${feedback.credibilityAndTrust.rating}/5): ${feedback.credibilityAndTrust.reasoning}`,
    `Emotional resonance (${feedback.emotionalResonance.rating}/5): ${feedback.emotionalResonance.reasoning}`,
    "",
    `GENERIC VS DISTINCT: ${feedback.genericVsDistinct}`,
    `PREDICTED ACTION: ${feedback.predictedAction}`,
    `BIGGEST FRICTION: ${feedback.biggestFriction.join(" | ")}`,
    `BIGGEST OPPORTUNITY: ${feedback.biggestOpportunity}`,
  ];
  if (feedback.buyerJourneyReactions) {
    lines.push(
      "",
      "BUYER JOURNEY REACTIONS",
      `Awareness: ${feedback.buyerJourneyReactions.awareness}`,
      `Consideration: ${feedback.buyerJourneyReactions.consideration}`,
      `Decision: ${feedback.buyerJourneyReactions.decision}`,
      `Potential partner: ${feedback.buyerJourneyReactions.potentialPartner}`,
    );
  }
  if (feedback.visualCallouts?.length) {
    lines.push(
      "",
      "VISUAL CALLOUTS",
      ...feedback.visualCallouts.map(
        (callout) =>
          `${callout.number}. Design ${callout.designImageNumber} — ${callout.label}: ${callout.note}`,
      ),
    );
  }
  lines.push("", `CONFIDENCE NOTE: ${feedback.confidenceNote}`, "", DISCLAIMER);
  return lines.filter((line, index) => line || lines[index - 1] !== "").join("\n");
}

type PersonaGrounding = {
  id: string;
  name: string;
  customer_voice_raw_text: string | null;
  customer_voice_source_file_urls: string[] | null;
  customer_voice_parsed_content: unknown;
  sparktoro_source_file_url: string | null;
  sparktoro_parsed_sheets: unknown;
};

function parseReferences(value: unknown, legacyUrl: string | null, legacyNote: string | null) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is ReferenceExample =>
        typeof item === "object" && item !== null && "url" in item && typeof item.url === "string",
    );
  }
  return legacyUrl ? [{ url: legacyUrl, note: legacyNote ?? "" }] : [];
}

function ReportPage() {
  const { testId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const { data: test, error } = await supabase
        .from("design_tests")
        .select(
          "*, personas(id, name, customer_voice_raw_text, customer_voice_source_file_urls, customer_voice_parsed_content, sparktoro_source_file_url, sparktoro_parsed_sheets)",
        )
        .eq("id", testId)
        .single();
      if (error) throw error;
      return test;
    },
  });

  if (isLoading || !data) {
    return <AppShell><Loader2 className="size-5 animate-spin text-muted-foreground" /></AppShell>;
  }

  const feedback = data.feedback_result as unknown as FeedbackResult | null;
  const persona = data.personas as PersonaGrounding | null;
  if (!feedback) {
    return <AppShell><p className="text-sm text-muted-foreground">This report has no feedback stored.</p></AppShell>;
  }

  const designImages = data.design_image_urls?.length
    ? data.design_image_urls
    : data.design_image_url
      ? [data.design_image_url]
      : [];
  const references = parseReferences(
    data.reference_example_images,
    data.reference_example_image_url,
    data.reference_example_note,
  );
  const hasVoice = Boolean(
    persona?.customer_voice_raw_text?.trim() ||
      persona?.customer_voice_source_file_urls?.length ||
      (Array.isArray(persona?.customer_voice_parsed_content) && persona.customer_voice_parsed_content.length),
  );
  const hasSparkToro = Boolean(persona?.sparktoro_source_file_url || persona?.sparktoro_parsed_sheets);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="label-eyebrow">{data.design_type || "Design"} · {new Date(data.created_at).toLocaleString()}</p>
          <h1 className="text-2xl font-bold">Reaction from {persona?.name ?? "this persona"}</h1>
          {data.design_label && <p className="font-mono text-xs text-muted-foreground">{data.design_label}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(asText(feedback, persona?.name ?? "persona")); toast.success("Report copied as text."); }}>
            <Copy /> Copy as text
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer /> Save as PDF</Button>
          {persona && <Button asChild size="sm"><Link to="/tests/new" search={{ persona: persona.id }}><RotateCcw /> Test a new version</Link></Button>}
        </div>
      </div>

      {feedback.executiveSummary && (
        <section className="grain-top mt-6 border-y border-primary/40 bg-primary/10 px-5 py-5 sm:px-6">
          <p className="label-eyebrow text-primary">Executive verdict</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">{feedback.executiveSummary.overallVerdict}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-foreground">{feedback.executiveSummary.oneLineSummary}</p>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Grounding inputs">
        <GroundingBadge label="SparkToro persona data" present={hasSparkToro} />
        <GroundingBadge label="Customer voice" present={hasVoice} />
        <GroundingBadge label="Reference examples" present={references.length > 0} />
      </div>

      <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">{DISCLAIMER}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            <section className="panel grain-top space-y-4 p-6">
              <p className="label-eyebrow">Gut reaction</p>
              <p className="font-display text-xl leading-snug">{feedback.gutReaction}</p>
              <blockquote className="border-l-2 border-primary pl-4 text-base italic text-muted-foreground">“{feedback.personaQuote}”</blockquote>
            </section>
            {feedback.blinkTest && (
              <section className="panel space-y-3 p-6">
                <div className="flex items-center gap-2"><Timer className="size-4 text-primary" /><p className="label-eyebrow">3–5 second blink test</p></div>
                <p className="font-display text-lg font-semibold capitalize">{feedback.blinkTest.verdict}</p>
                <p className="text-sm text-foreground">{feedback.blinkTest.whatRegistersInWindow}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{feedback.blinkTest.reasoning}</p>
              </section>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBlock title="Message clarity" rating={feedback.messageClarity.rating} reasoning={feedback.messageClarity.reasoning} />
            <ScoreBlock title="Visual hierarchy" rating={feedback.visualHierarchy.rating} reasoning={feedback.visualHierarchy.reasoning} />
            <ScoreBlock title="Credibility & trust" rating={feedback.credibilityAndTrust.rating} reasoning={feedback.credibilityAndTrust.reasoning} />
            <ScoreBlock title="Emotional resonance" rating={feedback.emotionalResonance.rating} reasoning={feedback.emotionalResonance.reasoning} />
          </div>

          {feedback.buyerJourneyReactions && (
            <section className="panel space-y-4 p-5">
              <div><p className="label-eyebrow">Buyer's journey</p><h2 className="mt-1 text-base font-semibold">The same person, at four different moments</h2></div>
              <BuyerJourney reactions={feedback.buyerJourneyReactions} />
            </section>
          )}

          <section className="panel space-y-2 p-4"><p className="label-eyebrow">Generic vs distinct</p><p className="text-sm text-muted-foreground">{feedback.genericVsDistinct}</p></section>
          <section className="panel space-y-2 p-4"><p className="label-eyebrow">Predicted action</p><p className="text-base text-foreground">{feedback.predictedAction}</p></section>
          <section className="panel space-y-2 p-4"><p className="label-eyebrow">Biggest friction</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{feedback.biggestFriction.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section className="panel space-y-2 p-4"><p className="label-eyebrow">Biggest opportunity</p><p className="text-sm text-foreground">{feedback.biggestOpportunity}</p></section>
          <section className="panel space-y-2 p-4"><p className="label-eyebrow">How grounded is this?</p><p className="text-sm text-muted-foreground">{feedback.confidenceNote}</p></section>
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="space-y-3">
            <div><p className="label-eyebrow">Designs tested</p><p className="mt-1 text-xs text-muted-foreground">{designImages.length} image{designImages.length === 1 ? "" : "s"} submitted</p></div>
            {designImages.map((path, index) => (
              <div key={path} className="panel space-y-2 p-3">
                <p className="font-mono text-[10px] text-muted-foreground">Design photo {index + 1}</p>
                <AnnotatedDesign path={path} imageNumber={index + 1} callouts={feedback.visualCallouts ?? []} />
              </div>
            ))}
          </section>

          {references.length > 0 && (
            <section className="space-y-3">
              <div><p className="label-eyebrow">Reference examples</p><p className="mt-1 text-xs text-muted-foreground">Compared separately from your design</p></div>
              {references.map((reference, index) => (
                <div key={`${reference.url}-${index}`} className="panel space-y-2 p-3">
                  <p className="font-mono text-[10px] text-muted-foreground">Reference example {String.fromCharCode(65 + index)}</p>
                  <StoredImage path={reference.url} alt={`Reference example ${String.fromCharCode(65 + index)}`} className="w-full rounded-md border border-border" />
                  {reference.note && <p className="text-xs text-muted-foreground">{reference.note}</p>}
                </div>
              ))}
            </section>
          )}

          <section className="panel space-y-2 p-4 text-sm text-muted-foreground">
            <p className="label-eyebrow">Context given</p>
            <p><span className="text-foreground">Goal:</span> {data.goal || "—"}</p>
            <p><span className="text-foreground">Where:</span> {data.channel_context || "—"}</p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}