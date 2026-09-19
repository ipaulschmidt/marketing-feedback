import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let active = true;
    supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}

export function StoredImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = useSignedUrl(path);
  const isPdf = Boolean(path?.toLowerCase().endsWith(".pdf"));

  if (!path) return null;
  if (isPdf) {
    return (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <FileText className="size-4" />
        Open PDF
      </a>
    );
  }
  if (!url) return <div className={`animate-pulse rounded-md bg-muted ${className ?? "h-40"}`} />;
  return <img src={url} alt={alt} className={className} />;
}
