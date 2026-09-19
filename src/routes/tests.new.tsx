import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runDesignTest } from "@/lib/tests.functions";
import { fileToPayload } from "@/lib/client-files";
import { DESIGN_TYPES, DISCLAIMER } from "@/lib/persona-schema";

export const Route = createFileRoute("/tests/new")({
  validateSearch: z.object({ persona: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "New design test — Audience Gut Check" },
      {
        name: "description",
        content: "Upload a design and get an honest, specific reaction from your audience persona.",
      },
      { property: "og:title", content: "New design test — Audience Gut Check" },
      {
        property: "og:description",
        content: "Upload a design and get an honest, specific reaction from your audience persona.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewTest,
});

function NewTest() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const run = useServerFn(runDesignTest);

  const [personaId, setPersonaId] = useState(search.persona ?? "");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designType, setDesignType] = useState("");
  const [goal, setGoal] = useState("");
  const [channelContext, setChannelContext] = useState("");
  const [designLabel, setDesignLabel] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceNote, setReferenceNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: personas } = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function submit() {
    if (!personaId) {
      toast.error("Pick a persona first.");
      return;
    }
    if (!designFile) {
      toast.error("Upload the design you want tested.");
      return;
    }
    setBusy(true);
    try {
      const result = await run({
        data: {
          personaId,
          designType,
          goal,
          channelContext,
          designLabel,
          referenceNote,
          design: await fileToPayload(designFile),
          reference: referenceFile ? await fileToPayload(referenceFile) : null,
        },
      });
      navigate({ to: "/tests/$testId", params: { testId: result.testId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-1">
        <p className="label-eyebrow">New test</p>
        <h1 className="text-2xl font-bold">Put the work in front of them</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">Persona &amp; design</h2>
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a persona" />
              </SelectTrigger>
              <SelectContent>
                {personas?.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="label-eyebrow">Design (PNG, JPG or PDF)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
              <Upload className="size-4" />
              {designFile ? designFile.name : "Choose file"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setDesignFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="label-eyebrow">Version label (optional)</Label>
            <Input
              value={designLabel}
              onChange={(e) => setDesignLabel(e.target.value)}
              placeholder="e.g. v2 — shorter headline"
            />
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">Context</h2>
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Design type</Label>
            <Select value={designType} onValueChange={setDesignType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {DESIGN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Goal</Label>
            <Textarea
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this make them do? e.g. reply to book a demo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Where they'll see it</Label>
            <Textarea
              rows={2}
              value={channelContext}
              onChange={(e) => setChannelContext(e.target.value)}
              placeholder="e.g. walking past a booth in a loud conference hall"
            />
          </div>
        </section>
      </div>

      <section className="panel mt-6 space-y-4 p-5">
        <div>
          <h2 className="font-display text-base font-semibold">
            Compare against a real example{" "}
            <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a screenshot of something comparable already in the market. Links are kept as notes
            only — nothing is fetched from the web.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
          <Upload className="size-4" />
          {referenceFile ? referenceFile.name : "Choose reference image or PDF"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="space-y-1.5">
          <Label className="label-eyebrow">Note about the reference</Label>
          <Textarea
            rows={2}
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
            placeholder="e.g. competitor's booth at SaaStr 2025"
          />
        </div>
      </section>

      <div className="mt-6 space-y-3">
        <Button onClick={submit} disabled={busy} size="lg">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Reacting to your design…" : "Get feedback"}
        </Button>
        {busy && (
          <p className="text-sm text-muted-foreground">
            This usually takes 15–40 seconds, longer with a reference image. Keep this tab open.
          </p>
        )}
        <p className="max-w-2xl text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </AppShell>
  );
}
