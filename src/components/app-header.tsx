import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { FormSubmit, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  const signedIn = Boolean(name || email);

  return (
    <header className="border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Steady
        </Link>
        {signedIn ? (
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Today
            </Link>
            <Link
              href="/goals"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Goals
            </Link>
            <Link
              href="/finance"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Finance
            </Link>
            <form action={signOutAction}>
              <FormSubmit variant="outline" size="sm">
                Log out
              </FormSubmit>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Create account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
