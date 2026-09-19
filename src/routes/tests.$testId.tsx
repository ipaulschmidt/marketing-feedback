import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StoredImage } from "@/components/StoredImage";
import { Button } from "@/components/ui/button";
import { DISCLAIMER, type FeedbackResult } from "@/lib/persona-schema";

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
        <span
          key={step}
          className={`h-2 w-6 rounded-sm ${step <= value ? "bg-primary" : "bg-muted"}`}
        />
      ))}
      <span className="ml-1 font-mono text-xs text-muted-foreground">{value}/5</span>
    </div>
  );
}

function ScoreBlock({
  title,
  rating,
  reasoning,
}: {
  title: string;
  rating: number;
  reasoning: string;
}) {
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

function asText(feedback: FeedbackResult, personaName: string): string {
  return [
    `Audience Gut Check — ${personaName}`,
    "",
    `GUT REACTION: ${feedback.gutReaction}`,
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
    `CONFIDENCE NOTE: ${feedback.confidenceNote}`,
    "",
    DISCLAIMER,
  ].join("\n");
}

function ReportPage() {
  const { testId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      const { data: test, error } = await supabase
        .from("design_tests")
        .select("*, personas(id, name)")
        .eq("id", testId)
        .single();
      if (error) throw error;
      return test;
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  const feedback = data.feedback_result as unknown as FeedbackResult | null;
  const persona = data.personas as { id: string; name: string } | null;

  if (!feedback) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">This report has no feedback stored.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="label-eyebrow">
            {data.design_type || "Design"} · {new Date(data.created_at).toLocaleString()}
          </p>
          <h1 className="text-2xl font-bold">
            Reaction from {persona?.name ?? "this persona"}
          </h1>
          {data.design_label && (
            <p className="font-mono text-xs text-muted-foreground">{data.design_label}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(asText(feedback, persona?.name ?? "persona"));
              toast.success("Report copied as text.");
            }}
          >
            <Copy className="size-4" /> Copy as text
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Save as PDF
          </Button>
          {persona && (
            <Button asChild size="sm">
              <Link to="/tests/new" search={{ persona: persona.id }}>
                <RotateCcw className="size-4" /> Test a new version
              </Link>
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
        {DISCLAIMER}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="panel grain-top space-y-4 p-6">
            <p className="label-eyebrow">Gut reaction</p>
            <p className="font-display text-xl leading-snug">{feedback.gutReaction}</p>
            <blockquote className="border-l-2 border-primary pl-4 text-base italic text-muted-foreground">
              “{feedback.personaQuote}”
            </blockquote>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBlock
              title="Message clarity"
              rating={feedback.messageClarity.rating}
              reasoning={feedback.messageClarity.reasoning}
            />
            <ScoreBlock
              title="Visual hierarchy"
              rating={feedback.visualHierarchy.rating}
              reasoning={feedback.visualHierarchy.reasoning}
            />
            <ScoreBlock
              title="Credibility & trust"
              rating={feedback.credibilityAndTrust.rating}
              reasoning={feedback.credibilityAndTrust.reasoning}
            />
            <ScoreBlock
              title="Emotional resonance"
              rating={feedback.emotionalResonance.rating}
              reasoning={feedback.emotionalResonance.reasoning}
            />
          </div>

          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">Generic vs distinct</p>
            <p className="text-sm text-muted-foreground">{feedback.genericVsDistinct}</p>
          </div>

          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">Predicted action</p>
            <p className="text-base text-foreground">{feedback.predictedAction}</p>
          </div>

          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">Biggest friction</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {feedback.biggestFriction.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">Biggest opportunity</p>
            <p className="text-sm text-foreground">{feedback.biggestOpportunity}</p>
          </div>

          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">How grounded is this?</p>
            <p className="text-sm text-muted-foreground">{feedback.confidenceNote}</p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel space-y-2 p-4">
            <p className="label-eyebrow">Design tested</p>
            <StoredImage
              path={data.design_image_url}
              alt="Tested design"
              className="w-full rounded-md border border-border"
            />
          </div>
          {data.reference_example_image_url && (
            <div className="panel space-y-2 p-4">
              <p className="label-eyebrow">Reference example</p>
              <StoredImage
                path={data.reference_example_image_url}
                alt="Reference example"
                className="w-full rounded-md border border-border"
              />
              {data.reference_example_note && (
                <p className="text-xs text-muted-foreground">{data.reference_example_note}</p>
              )}
            </div>
          )}
          <div className="panel space-y-2 p-4 text-sm text-muted-foreground">
            <p className="label-eyebrow">Context given</p>
            <p>
              <span className="text-foreground">Goal:</span> {data.goal || "—"}
            </p>
            <p>
              <span className="text-foreground">Where:</span> {data.channel_context || "—"}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
