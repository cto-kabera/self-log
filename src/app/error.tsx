"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error() {
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
