"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, signInAction, signUpAction } from "@/actions/auth";
import { GoogleSignIn } from "@/components/google-sign-in";
import { FormSubmit } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "signup" ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  return (
    <div className="grid gap-4">
      <GoogleSignIn />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or email
        <span className="h-px flex-1 bg-border" />
      </div>
      <form action={formAction} className="grid gap-4">
        {mode === "signup" ? (
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder="Alex"
            />
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        {state && "error" in state ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state && "message" in state ? (
          <p className="text-sm text-foreground" role="status">
            {state.message}
          </p>
        ) : null}
        <FormSubmit disabled={pending}>
          {pending
            ? "Working…"
            : mode === "signup"
              ? "Create account"
              : "Log in"}
        </FormSubmit>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
