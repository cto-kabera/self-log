import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { habit, habitCompletion } from "@/db/schema";
import { currentStreak, weekEnding } from "@/lib/dates";

export async function listActiveHabits(userId: string, today: string) {
  const habits = await db.query.habit.findMany({
    where: and(eq(habit.userId, userId), isNull(habit.archivedAt)),
    orderBy: [desc(habit.createdAt)],
  });

  if (habits.length === 0) return [];

  const completions = await db.query.habitCompletion.findMany({
    where: eq(habitCompletion.userId, userId),
  });

  const byHabit = new Map<string, string[]>();
  for (const row of completions) {
    const list = byHabit.get(row.habitId) ?? [];
    list.push(row.completedOn);
    byHabit.set(row.habitId, list);
  }

  const week = weekEnding(today);

  return habits.map((item) => {
    const dates = byHabit.get(item.id) ?? [];
    const dateSet = new Set(dates);
    return {
      id: item.id,
      name: item.name,
      streak: currentStreak(dates, today),
      doneToday: dateSet.has(today),
      week: week.map((date) => ({
        date,
        done: dateSet.has(date),
      })),
    };
  });
}

export type HabitWithWeek = Awaited<ReturnType<typeof listActiveHabits>>[number];
