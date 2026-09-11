import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entries, goals } from "@/db/schema";
import {
  actualValue,
  allocatedFromIncome,
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
    allocationPercent: row.allocationPercent,
  };
}

function asEntry(row: typeof entries.$inferSelect): EntryRecord {
  return {
    id: row.id,
    goalId: row.goalId,
    label: row.label,
    plannedAmount: row.plannedAmount,
    actualAmount: row.actualAmount,
    comment: row.comment,
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
  incomePlanned?: number;
  incomeActual?: number;
  allocationTotalPercent?: number;
};

export function presentGoal(
  goal: GoalRecord,
  allGoals: GoalRecord[],
  allEntries: EntryRecord[],
  today: string,
): PresentedGoal {
  const children = allGoals
    .filter((item) => item.parentGoalId === goal.id && item.status !== "archived")
    .map((child) => presentGoal(child, allGoals, allEntries, today));
  const logs = allEntries.filter((entry) => entry.goalId === goal.id).slice(0, 5);

  const isFinancialParent =
    goal.type === "financial" && !goal.parentGoalId && children.length > 0;

  let presentedChildren = children;
  let actual = actualValue(goal, allGoals, allEntries);
  let planned = plannedValue(goal, allGoals);
  let incomePlanned: number | undefined;
  let incomeActual: number | undefined;
  let allocationTotalPercent: number | undefined;
  let targetForProgress = goal.targetValue;

  if (isFinancialParent) {
    const incomeKids = children.filter((child) => child.category === "source");
    const spendKids = children.filter((child) => child.category !== "source");
    incomePlanned = incomeKids.reduce((sum, child) => sum + child.targetValue, 0);
    incomeActual = incomeKids.reduce((sum, child) => sum + child.actual, 0);
    const budgetBase = incomePlanned > 0 ? incomePlanned : goal.targetValue;
    presentedChildren = children.map((child) => {
      if (child.category === "source") return child;
      const allocated = allocatedFromIncome(budgetBase, child.allocationPercent);
      if (allocated == null) return child;
      const remaining = Math.max(0, allocated - child.actual);
      const percent =
        allocated === 0 ? 0 : Math.min(100, Math.round((child.actual / allocated) * 100));
      return {
        ...child,
        planned: allocated,
        remaining,
        percent,
        variance: child.actual - allocated,
      };
    });
    const presentedSpend = presentedChildren.filter((child) => child.category !== "source");
    actual = spendKids.reduce((sum, child) => sum + child.actual, 0);
    planned = presentedSpend.reduce((sum, child) => sum + child.planned, 0);
    targetForProgress = planned > 0 ? planned : goal.targetValue;
    allocationTotalPercent = spendKids.reduce(
      (sum, child) => sum + (child.allocationPercent ?? 0),
      0,
    );
  }

  const status = deriveStatus({
    status: goal.status,
    periodEnd: goal.periodEnd,
    today,
    target: targetForProgress,
    actual,
  });
  const remaining = Math.max(0, targetForProgress - actual);
  const percent =
    targetForProgress === 0
      ? 0
      : Math.min(100, Math.round((actual / targetForProgress) * 100));

  return {
    ...goal,
    actual,
    planned,
    remaining,
    percent,
    derivedStatus: status,
    variance: actual - planned,
    children: presentedChildren,
    logs,
    incomePlanned,
    incomeActual,
    allocationTotalPercent,
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
