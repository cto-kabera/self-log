import { GoalList, NewGoalForm } from "@/components/goal-list";
import { listActiveGoals } from "@/lib/goals";
import { requireUser } from "@/lib/session";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listActiveGoals(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
      <p className="mt-2 text-muted-foreground">
        Give the goal a number. Log whatever you did — even one unit counts.
      </p>
      <div className="mt-6">
        <NewGoalForm />
      </div>
      <div className="mt-8">
        <GoalList goals={goals} />
      </div>
    </main>
  );
}
