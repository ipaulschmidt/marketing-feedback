import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Audience Gut Check" },
      {
        name: "description",
        content: "Sign in to test your marketing creative against a data-grounded audience persona.",
      },
      { property: "og:title", content: "Sign in — Audience Gut Check" },
      {
        property: "og:description",
        content: "Sign in to test your marketing creative against a data-grounded audience persona.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grain-top flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="label-eyebrow">Audience Gut Check</p>
          <h1 className="text-3xl font-bold">
            Honest reactions, before you pay for real ones.
          </h1>
          <p className="text-sm text-muted-foreground">
            Build a persona from your audience data, then find out how it would actually react to
            your creative.
          </p>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-eyebrow">Password</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Sign in
          </Button>
          <p className="text-center text-xs text-muted-foreground">Private access · new accounts are disabled</p>
        </form>
      </div>
    </div>
  );
}
