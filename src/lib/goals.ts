import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { goal, goalEntry } from "@/db/schema";

export async function listActiveGoals(userId: string) {
  const goals = await db.query.goal.findMany({
    where: and(eq(goal.userId, userId), isNull(goal.archivedAt)),
    orderBy: [desc(goal.createdAt)],
  });

  if (goals.length === 0) return [];

  const entries = await db.query.goalEntry.findMany({
    where: eq(goalEntry.userId, userId),
    orderBy: [desc(goalEntry.createdAt)],
  });

  const byGoal = new Map<string, typeof entries>();
  for (const row of entries) {
    const list = byGoal.get(row.goalId) ?? [];
    list.push(row);
    byGoal.set(row.goalId, list);
  }

  return goals.map((item) => {
    const logs = byGoal.get(item.id) ?? [];
    const current = logs.reduce((sum, log) => sum + log.amount, 0);
    const percent = Math.min(100, Math.round((current / item.target) * 100));
    return {
      id: item.id,
      name: item.name,
      target: item.target,
      unit: item.unit,
      current,
      remaining: Math.max(0, item.target - current),
      percent,
      complete: current >= item.target,
      recent: logs.slice(0, 3).map((log) => ({
        id: log.id,
        amount: log.amount,
        note: log.note,
        createdAt: log.createdAt,
      })),
    };
  });
}

export type GoalWithProgress = Awaited<ReturnType<typeof listActiveGoals>>[number];
