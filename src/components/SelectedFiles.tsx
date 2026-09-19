import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SelectedFile = { file: File; note?: string };

export function SelectedFiles({
  items,
  notes = false,
  onChange,
}: {
  items: SelectedFile[];
  notes?: boolean;
  onChange: (items: SelectedFile[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.file.name}-${item.file.lastModified}`} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.file.name}</span>
          {notes && (
            <Input
              value={item.note ?? ""}
              onChange={(event) =>
                onChange(items.map((value, itemIndex) => itemIndex === index ? { ...value, note: event.target.value } : value))
              }
              placeholder={`Optional note for reference ${String.fromCharCode(65 + index)}`}
              className="max-w-sm"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${item.file.name}`}
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            <X />
          </Button>
        </div>
      ))}
    </div>
  );
}