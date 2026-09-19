import type { Json } from "@/integrations/supabase/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PersonaEditor } from "@/components/PersonaEditor";
import { ParseReportView } from "@/components/ParseReportView";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildPersonaDraft } from "@/lib/personas.functions";
import { filesToPayloads } from "@/lib/client-files";
import type { ParseReport, PersonaStructured } from "@/lib/persona-schema";

export const Route = createFileRoute("/personas/new")({
  head: () => ({
    meta: [
      { title: "New persona — Audience Gut Check" },
      {
        name: "description",
        content:
          "Import a SparkToro audience export and optional customer voice data to build a grounded persona.",
      },
      { property: "og:title", content: "New persona — Audience Gut Check" },
      {
        property: "og:description",
        content:
          "Import a SparkToro audience export and optional customer voice data to build a grounded persona.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewPersona,
});

type Draft = Awaited<ReturnType<typeof buildPersonaDraft>>;

function FilePicker({
  label,
  accept,
  multiple,
  files,
  onChange,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="label-eyebrow">{label}</Label>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
        <Upload className="size-4" />
        {files.length > 0 ? files.map((f) => f.name).join(", ") : `Choose file${multiple ? "s" : ""}`}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        />
      </label>
    </div>
  );
}

function NewPersona() {
  const navigate = useNavigate();
  const build = useServerFn(buildPersonaDraft);

  const [sparktoroFiles, setSparktoroFiles] = useState<File[]>([]);
  const [sparktoroText, setSparktoroText] = useState("");
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const [voiceText, setVoiceText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [persona, setPersona] = useState<PersonaStructured | null>(null);

  async function generate() {
    if (sparktoroFiles.length === 0 && !sparktoroText.trim()) {
      toast.error("Add a SparkToro export file or paste a summary first.");
      return;
    }
    setBusy(true);
    try {
      const result = await build({
        data: {
          sparktoroText,
          sparktoroFiles: await filesToPayloads(sparktoroFiles),
          voiceText,
          voiceFiles: await filesToPayloads(voiceFiles),
        },
      });
      setDraft(result);
      setPersona(result.persona);
      toast.success("Draft persona ready — review and edit it below.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the persona.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft || !persona) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("personas")
        .insert({
          user_id: userData.user!.id,
          name: persona.personaName || "Untitled persona",
          summary: persona.summary,
          structured_data: persona as unknown as Json,
          parse_report: draft.parseReport as unknown as Json,
          sparktoro_source_file_url: draft.artifacts.sparktoroPath,
          sparktoro_parsed_sheets: draft.artifacts.sparktoroSheets as unknown as Json,
          customer_voice_raw_text: draft.artifacts.voiceRawText || null,
          customer_voice_source_file_urls: draft.artifacts.voicePaths,
          customer_voice_parsed_content:
            draft.artifacts.voiceParsed as unknown as Json,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Persona saved.");
      navigate({ to: "/personas/$personaId", params: { personaId: data.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the persona.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-1">
        <p className="label-eyebrow">New persona</p>
        <h1 className="text-2xl font-bold">Ground the persona in real data</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">1. SparkToro export</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Required. Upload the full .xlsx export — every tab is read (websites, podcasts, social
              accounts, subreddits, hashtags, demographics), not just the first one.
            </p>
          </div>
          <FilePicker
            label="SparkToro .xlsx / .csv"
            accept=".xlsx,.xls,.csv"
            files={sparktoroFiles}
            onChange={setSparktoroFiles}
          />
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Or paste a summary</Label>
            <Textarea
              rows={5}
              value={sparktoroText}
              onChange={(e) => setSparktoroText(e.target.value)}
              placeholder="Paste SparkToro findings here if you'd rather not upload a file."
            />
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">
              2. Real customer voice{" "}
              <span className="text-sm font-normal text-muted-foreground">(optional, skippable)</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reviews, testimonials, sales call notes, survey verbatims. This is what grounds the
              persona's actual words and objections instead of guessing them.
            </p>
            <p className="mt-3 border-l-2 border-primary/60 pl-3 text-xs leading-relaxed text-muted-foreground">
              Where to get this: your own CRM export (deal notes, support tickets, chat transcripts,
              open-text survey responses), sales call transcripts if you use a call recording tool,
              NPS/CSAT verbatims, or your own claimed G2/Capterra profile's official review export. To
              reference public reviews of a competitor or category, copy a handful of representative
              excerpts yourself and paste them in below. Most review sites' terms don't allow automated
              scraping, so this tool doesn't attempt it.
            </p>
          </div>
          <FilePicker
            label="Files (.xlsx, .csv, .pdf, .txt, .docx)"
            accept=".xlsx,.xls,.csv,.pdf,.txt,.md,.docx"
            multiple
            files={voiceFiles}
            onChange={setVoiceFiles}
          />
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Or paste customer language</Label>
            <Textarea
              rows={5}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Paste reviews, verbatims or call notes in the customer's own words."
            />
          </div>
        </section>
      </div>

      <div className="mt-6">
        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "Reading your data…" : "Generate draft persona"}
        </Button>
      </div>

      {draft && persona && (
        <div className="mt-8 space-y-6">
          <ParseReportView report={draft.parseReport as ParseReport} />
          <section className="panel space-y-4 p-5">
            <div>
              <h2 className="font-display text-base font-semibold">3. Review &amp; edit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fix anything the import got wrong before you save. What is written here is what the
                feedback will be based on.
              </p>
            </div>
            <PersonaEditor value={persona} onChange={setPersona} />
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save persona
            </Button>
          </section>
        </div>
      )}
    </AppShell>
  );
}
