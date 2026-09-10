import { GoalList } from "@/components/goal-card";
import { NewGoalForm } from "@/components/goal-form";
import { getToday, requireUser } from "@/lib/session";
import { listTopLevelGoals } from "@/server/goals";

export default async function FinancePage() {
  const user = await requireUser();
  const today = await getToday();
  const goals = (await listTopLevelGoals(user.id, today)).filter(
    (goal) => goal.type === "financial",
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
      <p className="mt-2 text-muted-foreground">
        A financial goal is still a goal. Sub-goals hold bills, emergency fund,
        investment & saving, and income. Actuals are summed in the app, not in
        the database.
      </p>
      <div className="mt-6">
        <NewGoalForm today={today} financial />
      </div>
      <div className="mt-8">
        <GoalList
          goals={goals}
          emptyTitle="No financial goals this account"
          emptyBody="Create a period target, then log planned vs actual against each category."
        />
      </div>
    </main>
  );
}
