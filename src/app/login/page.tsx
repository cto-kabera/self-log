import { AuthForm } from "@/components/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");
  const { error } = await searchParams;
  const url = hasSupabaseConfig() ? supabaseUrl() : "";
  const key = hasSupabaseConfig() ? supabasePublishableKey() : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Google or email and password, through this app’s Supabase project.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {hasSupabaseConfig() ? null : (
            <p className="text-sm text-destructive" role="alert">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              to .env.local, then restart the app.
            </p>
          )}
          {error === "oauth" ? (
            <p className="text-sm text-destructive" role="alert">
              Google sign-in did not finish. Check the Supabase redirect URL and
              try again.
            </p>
          ) : null}
          <AuthForm
            mode="login"
            supabaseUrl={url}
            supabaseKey={key}
          />
        </CardContent>
      </Card>
    </main>
  );
}
