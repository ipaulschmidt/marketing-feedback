import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PersonaStructured } from "@/lib/persona-schema";

function ListField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-eyebrow">{label}</Label>
      <Textarea
        rows={4}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter((line) => line.trim() !== ""))}
        placeholder={hint}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PersonaEditor({
  value,
  onChange,
}: {
  value: PersonaStructured;
  onChange: (next: PersonaStructured) => void;
}) {
  const set = <K extends keyof PersonaStructured>(key: K, next: PersonaStructured[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="label-eyebrow">Persona name</Label>
          <Input value={value.personaName} onChange={(e) => set("personaName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="label-eyebrow">One-line summary</Label>
          <Input value={value.summary} onChange={(e) => set("summary", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="label-eyebrow">Role &amp; demographics</Label>
        <Textarea
          rows={3}
          value={value.roleAndDemographics}
          onChange={(e) => set("roleAndDemographics", e.target.value)}
        />
      </div>

      <ListField
        label="Media diet"
        hint="One per line — specific sites, podcasts, channels, accounts, newsletters."
        value={value.mediaDiet}
        onChange={(next) => set("mediaDiet", next)}
      />
      <ListField
        label="Interests & affinities"
        hint="One per line — topics, brands, hashtags, keywords."
        value={value.interestsAndAffinities}
        onChange={(next) => set("interestsAndAffinities", next)}
      />
      <ListField
        label="Customer voice highlights"
        hint="Real quotes or close paraphrases. Leave empty if you have no customer voice data."
        value={value.customerVoiceHighlights}
        onChange={(next) => set("customerVoiceHighlights", next)}
      />

      <div className="space-y-1.5">
        <Label className="label-eyebrow">Likely vocabulary &amp; tone</Label>
        <Textarea
          rows={3}
          value={value.likelyVocabularyAndTone}
          onChange={(e) => set("likelyVocabularyAndTone", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="label-eyebrow">What good already looks like</Label>
        <Textarea
          rows={3}
          value={value.whatGoodAlreadyLooksLike}
          onChange={(e) => set("whatGoodAlreadyLooksLike", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="label-eyebrow">Skepticism profile</Label>
        <Textarea
          rows={3}
          value={value.skepticismProfile}
          onChange={(e) => set("skepticismProfile", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="label-eyebrow">Where this came from</Label>
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {value.dataProvenance.map((entry, index) => (
            <div key={`${entry.field}-${index}`} className="grid gap-1 px-3 py-2 sm:grid-cols-[180px_1fr]">
              <span className="font-mono text-xs text-foreground">{entry.field}</span>
              <span className="text-xs text-muted-foreground">
                <span className="text-accent">{entry.source}</span>
                {entry.note ? ` — ${entry.note}` : ""}
              </span>
            </div>
          ))}
          {value.dataProvenance.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No provenance recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
