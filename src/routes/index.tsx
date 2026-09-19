import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareQuote, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Persona library — Audience Gut Check" },
      {
        name: "description",
        content:
          "Your saved audience personas, built from SparkToro exports and real customer voice data.",
      },
      { property: "og:title", content: "Persona library — Audience Gut Check" },
      {
        property: "og:description",
        content:
          "Your saved audience personas, built from SparkToro exports and real customer voice data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonaLibrary,
});

function PersonaLibrary() {
  const queryClient = useQueryClient();
  const { data: personas, isLoading } = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("id, name, summary, customer_voice_raw_text, customer_voice_parsed_content, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("personas").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete that persona.");
      return;
    }
    toast.success("Persona deleted.");
    queryClient.invalidateQueries({ queryKey: ["personas"] });
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="label-eyebrow">Persona library</p>
          <h1 className="text-2xl font-bold">Who are we testing against?</h1>
        </div>
        <Button asChild>
          <Link to="/personas/new">
            <Plus className="size-4" /> New persona
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && (personas?.length ?? 0) === 0 && (
          <div className="panel p-8 text-center">
            <h2 className="text-lg font-semibold">No personas yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start by importing a SparkToro audience export. Add real customer reviews or call notes
              too, and the feedback gets a lot sharper.
            </p>
            <Button asChild className="mt-4">
              <Link to="/personas/new">Build your first persona</Link>
            </Button>
          </div>
        )}

        {personas?.map((persona) => {
          const hasVoice =
            Boolean(persona.customer_voice_raw_text?.trim()) ||
            Array.isArray(persona.customer_voice_parsed_content);
          return (
            <div
              key={persona.id}
              className="panel flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/personas/$personaId"
                    params={{ personaId: persona.id }}
                    className="font-display text-base font-semibold hover:text-primary"
                  >
                    {persona.name}
                  </Link>
                  {hasVoice && (
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquareQuote className="size-3" /> customer voice
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                  {persona.summary || "No summary."}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {new Date(persona.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <Link to="/tests/new" search={{ persona: persona.id }}>
                    Run a test
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/personas/$personaId" params={{ personaId: persona.id }}>
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(persona.id)}
                  aria-label={`Delete ${persona.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
