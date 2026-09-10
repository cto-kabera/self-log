import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entries, goals } from "@/db/schema";
import {
  actualValue,
  deriveStatus,
  type EntryRecord,
  type GoalRecord,
  type GoalStatus,
  plannedValue,
} from "@/server/domain";

function asGoal(row: typeof goals.$inferSelect): GoalRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    targetValue: row.targetValue,
    status: row.status,
    parentGoalId: row.parentGoalId,
    category: row.category,
  };
}

function asEntry(row: typeof entries.$inferSelect): EntryRecord {
  return {
    id: row.id,
    goalId: row.goalId,
    label: row.label,
    plannedAmount: row.plannedAmount,
    actualAmount: row.actualAmount,
    loggedAt: row.loggedAt,
  };
}

export async function loadUserTracking(userId: string) {
  const [goalRows, entryRows] = await Promise.all([
    db.query.goals.findMany({
      where: eq(goals.userId, userId),
      orderBy: [desc(goals.createdAt)],
    }),
    db.query.entries.findMany({
      where: eq(entries.userId, userId),
      orderBy: [desc(entries.loggedAt)],
    }),
  ]);

  return {
    goals: goalRows.map(asGoal),
    entries: entryRows.map(asEntry),
  };
}

export type PresentedGoal = GoalRecord & {
  actual: number;
  planned: number;
  remaining: number;
  percent: number;
  derivedStatus: GoalStatus;
  variance: number;
  children: PresentedGoal[];
  logs: EntryRecord[];
};

export function presentGoal(
  goal: GoalRecord,
  allGoals: GoalRecord[],
  allEntries: EntryRecord[],
  today: string,
): PresentedGoal {
  const actual = actualValue(goal, allGoals, allEntries);
  const planned = plannedValue(goal, allGoals);
  const status = deriveStatus({
    status: goal.status,
    periodEnd: goal.periodEnd,
    today,
    target: goal.targetValue,
    actual,
  });
  const remaining = Math.max(0, goal.targetValue - actual);
  const percent =
    goal.targetValue === 0
      ? 0
      : Math.min(100, Math.round((actual / goal.targetValue) * 100));
  const children = allGoals
    .filter((item) => item.parentGoalId === goal.id && item.status !== "archived")
    .map((child) => presentGoal(child, allGoals, allEntries, today));
  const logs = allEntries.filter((entry) => entry.goalId === goal.id).slice(0, 5);

  return {
    ...goal,
    actual,
    planned,
    remaining,
    percent,
    derivedStatus: status,
    variance: actual - planned,
    children,
    logs,
  };
}

export async function listTopLevelGoals(userId: string, today: string) {
  const { goals: allGoals, entries: allEntries } = await loadUserTracking(userId);
  return allGoals
    .filter((goal) => !goal.parentGoalId && goal.status !== "archived")
    .map((goal) => presentGoal(goal, allGoals, allEntries, today));
}

export async function persistDerivedStatuses(userId: string, today: string) {
  const presented = await listTopLevelGoals(userId, today);
  for (const goal of presented) {
    if (goal.status === "archived") continue;
    if (goal.derivedStatus !== goal.status) {
      await db
        .update(goals)
        .set({ status: goal.derivedStatus })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)));
    }
  }
}

export async function getGoalForUser(userId: string, goalId: string) {
  return db.query.goals.findFirst({
    where: and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.parentGoalId)),
  });
}
