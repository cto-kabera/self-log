"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entries, goals } from "@/db/schema";
import { isISODate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  CATEGORIES,
  type Category,
  type GoalType,
  isCategory,
  isGoalType,
  nextMonthPeriod,
  periodForType,
} from "@/server/domain";

function refresh() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/finance");
}

function numberFrom(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : null;
}

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const target = numberFrom(formData, "target");
  const today = String(formData.get("today") ?? "");
  if (!title || !isGoalType(typeRaw) || target === null || target < 0 || !isISODate(today)) {
    return;
  }
  const type: GoalType = typeRaw;
  const customStart = String(formData.get("periodStart") ?? "");
  const customEnd = String(formData.get("periodEnd") ?? "");
  const period =
    type === "financial" && isISODate(customStart) && isISODate(customEnd)
      ? { start: customStart, end: customEnd }
      : periodForType(type, today);

  const id = crypto.randomUUID();
  await db.insert(goals).values({
    id,
    userId: user.id,
    type,
    title,
    periodStart: period.start,
    periodEnd: period.end,
    targetValue: target,
    status: "active",
    parentGoalId: null,
    category: null,
    createdAt: new Date(),
  });

  if (type === "financial") {
    const defaults: { category: Category; title: string }[] = [
      { category: "bills", title: "Bills" },
      { category: "emergency_fund", title: "Emergency fund" },
      { category: "investment_saving", title: "Investment & saving" },
      { category: "source", title: "Income sources" },
    ];
    for (const item of defaults) {
      const subTarget = numberFrom(formData, `sub_${item.category}`) ?? 0;
      await db.insert(goals).values({
        id: crypto.randomUUID(),
        userId: user.id,
        type: "financial",
        title: item.title,
        periodStart: period.start,
        periodEnd: period.end,
        targetValue: subTarget,
        status: "active",
        parentGoalId: id,
        category: item.category,
        createdAt: new Date(),
      });
    }
  }

  refresh();
}

export async function logEntry(formData: FormData) {
  const user = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || "Log";
  const planned = numberFrom(formData, "planned") ?? 0;
  const actual = numberFrom(formData, "actual");
  if (!goalId || actual === null) return;

  const owned = await db.query.goals.findFirst({
    where: and(eq(goals.id, goalId), eq(goals.userId, user.id)),
  });
  if (!owned || owned.status === "archived") return;

  await db.insert(entries).values({
    id: crypto.randomUUID(),
    goalId,
    userId: user.id,
    label,
    plannedAmount: planned,
    actualAmount: actual,
    loggedAt: new Date(),
  });
  refresh();
}

export async function archiveGoal(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(goals)
    .set({ status: "archived" })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  refresh();
}

export async function updateSubGoalTarget(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const target = numberFrom(formData, "target");
  if (!id || target === null || target < 0) return;
  await db
    .update(goals)
    .set({ targetValue: target })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  refresh();
}

export async function cloneFinancialToNextPeriod(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const parent = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, user.id)),
  });
  if (!parent || parent.type !== "financial" || parent.parentGoalId) return;

  const next = nextMonthPeriod(parent.periodStart);
  const children = await db.query.goals.findMany({
    where: and(eq(goals.parentGoalId, parent.id), eq(goals.userId, user.id)),
  });

  const newId = crypto.randomUUID();
  await db.insert(goals).values({
    ...parent,
    id: newId,
    periodStart: next.start,
    periodEnd: next.end,
    status: "active",
    createdAt: new Date(),
  });
  for (const child of children) {
    await db.insert(goals).values({
      ...child,
      id: crypto.randomUUID(),
      parentGoalId: newId,
      periodStart: next.start,
      periodEnd: next.end,
      status: "active",
      createdAt: new Date(),
    });
  }
  refresh();
}

export async function carryDailyGoals(formData: FormData) {
  const user = await requireUser();
  const today = String(formData.get("today") ?? "");
  if (!isISODate(today)) return;
  const existing = await db.query.goals.findMany({
    where: and(eq(goals.userId, user.id), eq(goals.type, "daily")),
  });
  if (existing.some((goal) => !goal.parentGoalId && goal.periodStart === today && goal.status !== "archived")) {
    return;
  }
  const templates = existing.filter(
    (goal) => !goal.parentGoalId && goal.status !== "archived",
  );
  const period = periodForType("daily", today);
  const seen = new Set<string>();
  for (const goal of templates) {
    if (seen.has(goal.title)) continue;
    seen.add(goal.title);
    await db.insert(goals).values({
      id: crypto.randomUUID(),
      userId: user.id,
      type: "daily",
      title: goal.title,
      periodStart: period.start,
      periodEnd: period.end,
      targetValue: goal.targetValue,
      status: "active",
      parentGoalId: null,
      category: null,
      createdAt: new Date(),
    });
  }
  refresh();
}

export { CATEGORIES, isCategory };
