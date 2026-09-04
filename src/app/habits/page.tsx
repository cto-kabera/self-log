import { HabitList, NewHabitForm } from "@/components/habit-list";
import { listActiveHabits } from "@/lib/habits";
import { prettyDate } from "@/lib/dates";
import { getToday, requireUser } from "@/lib/session";

export default async function HabitsPage() {
  const user = await requireUser();
  const today = await getToday();
  const habits = await listActiveHabits(user.id, today);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Habits</h1>
      <p className="mt-2 text-muted-foreground">
        Week ending {prettyDate(today)}. Tap a day to undo a check if you marked
        it by mistake.
      </p>
      <div className="mt-6">
        <NewHabitForm />
      </div>
      <div className="mt-8">
        <HabitList habits={habits} today={today} />
      </div>
    </main>
  );
}
