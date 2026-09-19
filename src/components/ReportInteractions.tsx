import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/components/StoredImage";
import { cn } from "@/lib/utils";
import type { FeedbackResult } from "@/lib/persona-schema";

type Callout = FeedbackResult["visualCallouts"][number];

export function AnnotatedDesign({
  path,
  imageNumber,
  callouts,
}: {
  path: string;
  imageNumber: number;
  callouts: Callout[];
}) {
  const url = useSignedUrl(path);
  const [active, setActive] = useState<number | null>(null);
  const imageCallouts = callouts.filter((callout) => callout.designImageNumber === imageNumber);
  const activeCallout = imageCallouts.find((callout) => callout.number === active) ?? null;
  const isPdf = path.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer" className="flex min-h-28 items-center justify-center gap-2 rounded-md border border-border bg-muted text-sm text-muted-foreground">
        <FileText className="size-5" /> Open design PDF {imageNumber}
      </a>
    );
  }
  if (!url) return <div className="aspect-[4/3] animate-pulse rounded-md bg-muted" />;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border border-border bg-muted">
        <img src={url} alt={`Tested design ${imageNumber}`} className="h-auto w-full" />
        {imageCallouts.map((callout, index) => {
          const selected = active === callout.number;
          return (
            <div
              key={`${callout.number}-${callout.label}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${callout.approxX}%`, top: `${callout.approxY}%` }}
              onMouseEnter={() => setActive(callout.number)}
              onMouseLeave={() => setActive(null)}
            >
              <Button
                type="button"
                size="icon"
                aria-expanded={selected}
                aria-label={`${callout.label}: ${callout.note}`}
                onClick={() => setActive(selected ? null : callout.number)}
                className={cn(
                  "report-affordance size-10 rounded-full border-[3px] border-background bg-primary font-mono text-sm font-bold text-primary-foreground shadow-xl transition-transform hover:scale-110",
                  index === 0 && "report-attention",
                  selected && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
              >
                {callout.number}
              </Button>
            </div>
          );
        })}
      </div>
      {imageCallouts.length > 0 && (
        <div className="space-y-2">
          <p className="text-center font-mono text-[10px] text-muted-foreground">Hover or tap a numbered pin · positions are approximate</p>
          <div className="min-h-24 rounded-md border border-border bg-popover p-4" aria-live="polite">
            {activeCallout ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">{activeCallout.number}</span>
                  <div>
                    <p className="text-sm font-semibold text-popover-foreground">{activeCallout.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activeCallout.note}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a numbered pin to read the observation.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STAGES = [
  ["awareness", "Awareness"],
  ["consideration", "Consideration"],
  ["decision", "Decision"],
  ["potentialPartner", "Potential partner"],
] as const;

export function BuyerJourney({ reactions }: { reactions: FeedbackResult["buyerJourneyReactions"] }) {
  const [active, setActive] = useState<(typeof STAGES)[number][0]>("awareness");
  return (
    <section className="space-y-4">
      <div className="relative grid grid-cols-2 gap-2 before:absolute before:left-[12%] before:right-[12%] before:top-5 before:hidden before:h-px before:bg-border sm:grid-cols-4 sm:before:block">
        {STAGES.map(([key, label], index) => (
          <Button
            key={key}
            type="button"
            variant={active === key ? "default" : "secondary"}
            onClick={() => setActive(key)}
            onMouseEnter={() => setActive(key)}
            onFocus={() => setActive(key)}
            className={cn(
              "report-affordance relative z-10 h-auto min-h-10 whitespace-normal px-2 py-2 text-xs transition-transform hover:scale-105",
              index === 0 && "report-attention",
            )}
          >
            {label}
          </Button>
        ))}
      </div>
      <blockquote className="min-h-24 border-l-2 border-primary bg-muted/40 px-4 py-3 text-sm italic text-foreground">
        “{reactions[active]}”
      </blockquote>
      <p className="text-center font-mono text-[10px] text-muted-foreground">Hover or tap a stage to see their reaction</p>
    </section>
  );
}