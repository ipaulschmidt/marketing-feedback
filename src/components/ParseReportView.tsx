import { Check, AlertTriangle } from "lucide-react";
import type { ParseReport } from "@/lib/persona-schema";

export function ParseReportView({ report }: { report: ParseReport }) {
  const sparkLines = report.sparktoro.map(
    (file) =>
      `${file.fileName}: ${file.sheets.length} sheet(s) parsed — ${file.sheets
        .map((s) => `${s.sheet} (${s.rows} rows)`)
        .join(", ")}`,
  );
  if (report.sparktoroPastedText) sparkLines.push("1 pasted SparkToro summary");

  const voiceLines = report.customerVoice.map((file) =>
    file.sheets.length > 0
      ? `${file.fileName}: ${file.sheets.length} sheet(s), ${file.sheets.reduce(
          (sum, s) => sum + s.rows,
          0,
        )} rows parsed`
      : `${file.fileName}: ${file.kind} parsed`,
  );
  if (report.customerVoicePastedText) voiceLines.push("1 pasted text block");

  return (
    <div className="panel space-y-3 p-4">
      <p className="label-eyebrow">What was imported</p>
      <Section title="SparkToro" lines={sparkLines} />
      <Section title="Customer voice" lines={voiceLines} emptyNote="None provided (optional)." />
    </div>
  );
}

function Section({
  title,
  lines,
  emptyNote,
}: {
  title: string;
  lines: string[];
  emptyNote?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {lines.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-warning" />
          {emptyNote ?? "Nothing parsed."}
        </p>
      ) : (
        lines.map((line) => (
          <p key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{line}</span>
          </p>
        ))
      )}
    </div>
  );
}
