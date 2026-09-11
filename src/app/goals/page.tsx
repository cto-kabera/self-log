import { GoalList } from "@/components/goal-card";
import { NewGoalForm } from "@/components/goal-form";
import { getToday, requireUser } from "@/lib/session";
import { listTopLevelGoals } from "@/server/goals";

export default async function GoalsPage() {
  const user = await requireUser();
  const today = await getToday();
  const goals = (await listTopLevelGoals(user.id, today)).filter(
    (goal) => goal.type !== "financial",
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
      <p className="mt-2 text-muted-foreground">
        Cadence is stored on the goal. Period dates are filled in from today
        unless you are creating a financial plan.
      </p>
      <div className="mt-6">
        <NewGoalForm today={today} defaultType="weekly" />
      </div>
      <div className="mt-8">
        <GoalList
          goals={goals}
          today={today}
          emptyTitle="No cadence goals yet"
          emptyBody="Add a daily, weekly, monthly, or quarterly target."
        />
      </div>
    </main>
  );
}
