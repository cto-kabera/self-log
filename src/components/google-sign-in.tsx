"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function GoogleSignIn({
  supabaseUrl,
  supabaseKey,
}: {
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startGoogle() {
    setError(null);
    setPending(true);
    if (!supabaseUrl) {
      setError("Add NEXT_PUBLIC_SUPABASE_URL to connect this app to Supabase.");
      setPending(false);
      return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(
      /\/$/,
      "",
    );
    const redirectTo = `${site}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={startGoogle}
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
