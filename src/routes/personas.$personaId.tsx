import type { Json } from "@/integrations/supabase/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PersonaEditor } from "@/components/PersonaEditor";
import { ParseReportView } from "@/components/ParseReportView";
import { StoredImage } from "@/components/StoredImage";
import { Button } from "@/components/ui/button";
import type { FeedbackResult, ParseReport, PersonaStructured } from "@/lib/persona-schema";

export const Route = createFileRoute("/personas/$personaId")({
  head: () => ({
    meta: [
      { title: "Persona detail — Audience Gut Check" },
      {
        name: "description",
        content: "Edit a saved audience persona and review every design test run against it.",
      },
      { property: "og:title", content: "Persona detail — Audience Gut Check" },
      {
        property: "og:description",
        content: "Edit a saved audience persona and review every design test run against it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonaDetail,
});

function PersonaDetail() {
  const { personaId } = Route.useParams();
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<PersonaStructured | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: persona, isLoading } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("id", personaId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tests } = useQuery({
    queryKey: ["tests", personaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_tests")
        .select("id, design_image_url, design_image_urls, design_type, design_label, feedback_result, created_at")
        .eq("persona_id", personaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (persona && !edited) setEdited(persona.structured_data as unknown as PersonaStructured);
  }, [persona, edited]);

  async function save() {
    if (!edited) return;
    setSaving(true);
    const { error } = await supabase
      .from("personas")
      .update({
        name: edited.personaName || "Untitled persona",
        summary: edited.summary,
        structured_data: edited as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personaId);
    setSaving(false);
    if (error) {
      toast.error("Could not save changes.");
      return;
    }
    toast.success("Persona updated.");
    queryClient.invalidateQueries({ queryKey: ["personas"] });
  }

  if (isLoading || !persona || !edited) {
    return (
      <AppShell>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="label-eyebrow">Persona</p>
          <h1 className="text-2xl font-bold">{persona.name}</h1>
        </div>
        <Button asChild>
          <Link to="/tests/new" search={{ persona: personaId }}>
            <Play className="size-4" /> Run a test
          </Link>
        </Button>
      </div>

      {persona.parse_report && (
        <div className="mt-6">
          <ParseReportView report={persona.parse_report as unknown as ParseReport} />
        </div>
      )}

      <section className="panel mt-6 space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Persona data</h2>
        <PersonaEditor value={edited} onChange={setEdited} />
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-base font-semibold">Test history</h2>
        {(tests?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            No tests yet. Upload a design to see how this persona reacts.
          </p>
        )}
        {tests?.map((test) => {
          const feedback = test.feedback_result as unknown as FeedbackResult | null;
          return (
            <Link
              key={test.id}
              to="/tests/$testId"
              params={{ testId: test.id }}
              className="panel flex gap-4 p-4 transition-colors hover:border-primary"
            >
              <StoredImage
                path={test.design_image_urls?.[0] ?? test.design_image_url}
                alt="Tested design"
                className="h-20 w-20 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-xs text-muted-foreground">
                  {new Date(test.created_at).toLocaleString()} · {test.design_type || "design"}
                  {test.design_label ? ` · ${test.design_label}` : ""}
                </p>
                <p className="line-clamp-2 text-sm text-foreground">
                  {feedback?.gutReaction ?? "No feedback stored."}
                </p>
                <p className="line-clamp-1 text-xs text-accent">{feedback?.predictedAction}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </AppShell>
  );
}
