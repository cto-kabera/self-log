"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7925/ingest/d17156d8-f8fd-4c26-b6f7-e30874c84942", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "77e8bf",
      },
      body: JSON.stringify({
        sessionId: "77e8bf",
        runId: "pre-fix",
        hypothesisId: "A,B,D,E",
        location: "app/error.tsx",
        message: "rsc error boundary",
        data: {
          errName: error.name,
          errMessage: error.message.slice(0, 300),
          digest: error.digest ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Could not load this page</h1>
      <p className="text-muted-foreground">
        You are signed in, but the dashboard failed to load. That usually means
        the app could not reach the database.
      </p>
      <Link href="/" className={cn(buttonVariants())}>
        Try again
      </Link>
    </main>
  );
}
