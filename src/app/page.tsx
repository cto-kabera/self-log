import Link from "next/link";
import { carryDailyGoals } from "@/actions/goals";
import { BillsLedger } from "@/components/bills-ledger";
import { GoalList } from "@/components/goal-card";
import { NewGoalForm } from "@/components/goal-form";
import { FormSubmit, buttonVariants } from "@/components/ui/button";
import { prettyDate } from "@/lib/dates";
import { getSession, getToday } from "@/lib/session";
import { overlapsToday } from "@/server/domain";
import { listTopLevelGoals } from "@/server/goals";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return <Landing />;

  const today = await getToday();
  const all = await listTopLevelGoals(session.user.id, today);
  const current = all.filter((goal) =>
    overlapsToday(goal.periodStart, goal.periodEnd, today),
  );
  const daily = current.filter((goal) => goal.type === "daily");
  const weekly = current.filter((goal) => goal.type === "weekly");
  const monthly = current.filter((goal) => goal.type === "monthly");
  const financial = current.filter((goal) => goal.type === "financial");
  const quarterly = current.filter((goal) => goal.type === "quarterly");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{prettyDate(today)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Hello, {session.user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Daily, weekly, monthly, and quarterly goals share one model. Financial
          targets roll up from bills, reserves, and income entries.
        </p>
      </div>
      <div className="grid gap-10">
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-medium">Today</h2>
            <form action={carryDailyGoals}>
              <input type="hidden" name="today" value={today} />
              <FormSubmit variant="outline" size="sm">
                Carry dailies to today
              </FormSubmit>
            </form>
          </div>
          <NewGoalForm today={today} defaultType="daily" />
          <GoalList
            goals={daily}
            today={today}
            emptyTitle="No daily goals this period"
            emptyBody="Add a daily target, or carry yesterday’s titles into today."
          />
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <h2 className="text-lg font-medium">This week</h2>
            <GoalList
              goals={weekly}
              compact
              today={today}
              emptyTitle="No weekly goals"
              emptyBody="Set a weekly target from the Goals page."
            />
          </div>
          <div className="grid gap-4">
            <h2 className="text-lg font-medium">This month</h2>
            <GoalList
              goals={monthly}
              compact
              today={today}
              emptyTitle="No monthly goals"
              emptyBody="Set a monthly target from the Goals page."
            />
          </div>
        </section>
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Bills this cycle</h2>
              <p className="text-sm text-muted-foreground">
                Target and vote head per bill. Log spend as it happens — totals
                add up so you can check them against the target.
              </p>
            </div>
            <Link
              href="/finance"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Full finance plan
            </Link>
          </div>
          {financial.length === 0 ? (
            <GoalList
              goals={[]}
              today={today}
              emptyTitle="No financial plan this cycle"
              emptyBody="Open Finance to set bill targets and vote heads."
            />
          ) : (
            financial.map((plan) => {
              const bills = plan.children.find(
                (child) => child.category === "bills",
              );
              return bills ? (
                <BillsLedger key={bills.id} bills={bills} today={today} />
              ) : (
                <GoalList
                  key={plan.id}
                  goals={[plan]}
                  today={today}
                  emptyTitle="No bills"
                  emptyBody="This plan has no bills category yet."
                />
              );
            })
          )}
        </section>
        {quarterly.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="text-lg font-medium">This quarter</h2>
            <GoalList
              goals={quarterly}
              compact
              emptyTitle="No quarterly goals"
              emptyBody=""
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-primary">Self-help tracking tool</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        One goal domain. Cadence plus a financial plan.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Track daily through quarterly targets, then run a financial plan with a
        bills month target and vote heads (name plus amount) so spend is
        measured against the plan.
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
          Daily, weekly, monthly, and quarterly goals are the same entity.
        </li>
        <li className="rounded-xl border bg-card p-4">
          Financial sub-goals for bills, emergency fund, saving, and income.
        </li>
        <li className="rounded-xl border bg-card p-4">
          Email/password and Google sign-in through a dedicated Supabase project.
        </li>
      </ul>
    </main>
  );
}
