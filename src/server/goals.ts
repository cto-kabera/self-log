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
  voteHeadSortIndex,
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
    occurredOn: row.occurredOn,
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
  voteHeadTotal?: number;
};

export function presentGoal(
  goal: GoalRecord,
  allGoals: GoalRecord[],
  allEntries: EntryRecord[],
  today: string,
): PresentedGoal {
  const categoryOrder: Record<string, number> = {
    bills: 0,
    emergency_fund: 1,
    investment_saving: 2,
    source: 3,
  };
  const children = allGoals
    .filter((item) => item.parentGoalId === goal.id && item.status !== "archived")
    .sort((a, b) => {
      if (goal.category === "bills") {
        const byVote = voteHeadSortIndex(a.title) - voteHeadSortIndex(b.title);
        if (byVote !== 0) return byVote;
      }
      const byCategory =
        (categoryOrder[a.category ?? ""] ?? 9) - (categoryOrder[b.category ?? ""] ?? 9);
      if (byCategory !== 0) return byCategory;
      return a.title.localeCompare(b.title);
    })
    .map((child) => presentGoal(child, allGoals, allEntries, today));
  const logs = allEntries
    .filter((entry) => entry.goalId === goal.id)
    .sort((a, b) => {
      const aDay = a.occurredOn ?? "";
      const bDay = b.occurredOn ?? "";
      if (aDay !== bDay) return bDay.localeCompare(aDay);
      return b.loggedAt.getTime() - a.loggedAt.getTime();
    })
    .slice(0, 20);

  const isFinancialParent =
    goal.type === "financial" && !goal.parentGoalId && children.length > 0;

  let presentedChildren = children;
  let actual = actualValue(goal, allGoals, allEntries);
  let planned = plannedValue(goal, allGoals);
  let incomePlanned: number | undefined;
  let incomeActual: number | undefined;
  let allocationTotalPercent: number | undefined;
  let voteHeadTotal: number | undefined;
  let targetForProgress = goal.targetValue;

  if (isFinancialParent) {
    const incomeKids = children.filter((child) => child.category === "source");
    const spendKids = children.filter((child) => child.category !== "source");
    incomePlanned = incomeKids.reduce((sum, child) => sum + child.targetValue, 0);
    incomeActual = incomeKids.reduce((sum, child) => sum + child.actual, 0);
    const presentedSpend = children.filter((child) => child.category !== "source");
    actual = spendKids.reduce((sum, child) => sum + child.actual, 0);
    planned = presentedSpend.reduce((sum, child) => sum + child.planned, 0);
    targetForProgress = planned > 0 ? planned : goal.targetValue;
    allocationTotalPercent = spendKids.reduce(
      (sum, child) => sum + (child.allocationPercent ?? 0),
      0,
    );
  }

  if (goal.category === "bills") {
    voteHeadTotal = children.reduce((sum, child) => sum + child.targetValue, 0);
    planned = voteHeadTotal > 0 ? voteHeadTotal : goal.targetValue || planned;
    targetForProgress = planned;
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
    voteHeadTotal,
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
