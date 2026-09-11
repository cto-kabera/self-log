import { GoalList } from "@/components/goal-card";
import { NewGoalForm } from "@/components/goal-form";
import { prettyDate } from "@/lib/dates";
import { getToday, requireUser } from "@/lib/session";
import { financialCyclePeriod, isFinancialPlanningDay } from "@/server/domain";
import { listTopLevelGoals } from "@/server/goals";

export default async function FinancePage() {
  const user = await requireUser();
  const today = await getToday();
  const cycle = financialCyclePeriod(today);
  const planningDay = isFinancialPlanningDay(today);
  const goals = (await listTopLevelGoals(user.id, today)).filter(
    (goal) => goal.type === "financial",
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
      <p className="mt-2 text-muted-foreground">
        Each cycle runs from the 10th to the 9th. Set the plan target as bills +
        emergency fund + investment & saving. Under bills, set a month target,
        then track spend against it by vote head and amount.
      </p>
      <p className="mt-3 rounded-lg border bg-card px-3 py-2 text-sm">
        This cycle: {prettyDate(cycle.start)} – {prettyDate(cycle.end)}
        {planningDay ? " · Planning day — set category targets now." : ""}
      </p>
      <div className="mt-6">
        <NewGoalForm today={today} financial />
      </div>
      <div className="mt-8">
        <GoalList
          goals={goals}
          today={today}
          emptyTitle="No financial plan this cycle"
          emptyBody="Create a plan on the 10th, then record bills through the month."
        />
      </div>
    </main>
  );
}
