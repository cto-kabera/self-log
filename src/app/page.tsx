import Link from "next/link";
import { GoalList } from "@/components/goal-list";
import { HabitList } from "@/components/habit-list";
import { buttonVariants } from "@/components/ui/button";
import { prettyDate } from "@/lib/dates";
import { listActiveGoals } from "@/lib/goals";
import { listActiveHabits } from "@/lib/habits";
import { getSession, getToday } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    return <Landing />;
  }

  const today = await getToday();
  const [habits, goals] = await Promise.all([
    listActiveHabits(session.user.id, today),
    listActiveGoals(session.user.id),
  ]);
  const doneCount = habits.filter((habit) => habit.doneToday).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{prettyDate(today)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Hello, {session.user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {habits.length === 0
            ? "Add a habit to start the day, then give a goal a number you can actually move."
            : doneCount === habits.length
              ? "Every habit is checked for today. If a goal still has room, log a little progress."
              : `${doneCount} of ${habits.length} habits done today. Keep the chain going.`}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="grid gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-medium">Today’s habits</h2>
            <Link
              href="/habits"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Open week
            </Link>
          </div>
          <HabitList habits={habits} today={today} compact />
        </section>
        <section className="grid gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-medium">Active goals</h2>
            <Link
              href="/goals"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Manage goals
            </Link>
          </div>
          <GoalList goals={goals} compact />
        </section>
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-primary">Self-help tracker</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Check off the day. Move the goal. Come back tomorrow.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Steady keeps daily habits and numbered goals in one place, behind an
        account so your streaks follow you to another device.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
          Create a free account
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Log in
        </Link>
      </div>
      <ul className="mt-12 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
        <li className="rounded-xl border bg-card p-4">
          Daily check-offs with a seven-day grid and current streaks.
        </li>
        <li className="rounded-xl border bg-card p-4">
          Goals with a target, unit, and a running percent complete.
        </li>
        <li className="rounded-xl border bg-card p-4">
          Email and password accounts. Your data stays on this server.
        </li>
      </ul>
    </main>
  );
}
