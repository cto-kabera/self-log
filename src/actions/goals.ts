"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entries, goals } from "@/db/schema";
import { isISODate } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  type Category,
  DEFAULT_BILL_VOTE_HEADS,
  type GoalType,
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

function allocationPercentFrom(formData: FormData, key: string) {
  const percent = numberFrom(formData, key);
  if (percent == null || percent <= 0 || percent > 100) return null;
  return percent;
}

function firstISODate(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = String(formData.get(key) ?? "");
    if (isISODate(value)) return value;
  }
  return null;
}

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const target = numberFrom(formData, "target");
  const today = String(formData.get("today") ?? "");
  if (!title || !isGoalType(typeRaw) || !isISODate(today)) {
    return;
  }
  if (typeRaw !== "financial" && (target === null || target < 0)) {
    return;
  }
  const type: GoalType = typeRaw;
  const customStart = firstISODate(formData, "periodStart", "periodStartFallback");
  const customEnd = firstISODate(formData, "periodEnd", "periodEndFallback");
  const period =
    type === "financial" && customStart && customEnd
      ? { start: customStart, end: customEnd }
      : periodForType(type, today);

  const income = numberFrom(formData, "sub_source") ?? 0;
  let resolvedTarget = target ?? 0;
  if (type === "financial" && income > 0) {
    resolvedTarget = income;
  }
  if (resolvedTarget < 0) return;

  const id = crypto.randomUUID();
  await db.insert(goals).values({
    id,
    userId: user.id,
    type,
    title,
    periodStart: period.start,
    periodEnd: period.end,
    targetValue: resolvedTarget,
    status: "active",
    parentGoalId: null,
    category: null,
    allocationPercent: null,
    createdAt: new Date(),
  });

  if (type === "financial") {
    const defaults: { category: Category; title: string; percentKey: string; amountKey: string }[] =
      [
        { category: "bills", title: "Bills", percentKey: "pct_bills", amountKey: "sub_bills" },
        {
          category: "emergency_fund",
          title: "Emergency fund",
          percentKey: "pct_emergency_fund",
          amountKey: "sub_emergency_fund",
        },
        {
          category: "investment_saving",
          title: "Investment & saving",
          percentKey: "pct_investment_saving",
          amountKey: "sub_investment_saving",
        },
        { category: "source", title: "Income sources", percentKey: "", amountKey: "sub_source" },
      ];
    for (const item of defaults) {
      const percent =
        item.category === "source"
          ? null
          : allocationPercentFrom(formData, item.percentKey);
      const fallbackAmount = numberFrom(formData, item.amountKey) ?? 0;
      const allocated =
        item.category !== "source" && percent != null && income > 0
          ? Math.round(income * percent) / 100
          : fallbackAmount;
      const categoryId = crypto.randomUUID();
      await db.insert(goals).values({
        id: categoryId,
        userId: user.id,
        type: "financial",
        title: item.title,
        periodStart: period.start,
        periodEnd: period.end,
        targetValue: allocated,
        status: "active",
        parentGoalId: id,
        category: item.category,
        allocationPercent: item.category === "source" ? null : percent,
        createdAt: new Date(),
      });

      const lineTitles =
        item.category === "bills"
          ? DEFAULT_BILL_VOTE_HEADS.map((line) => ({
              title: line.title,
              amount: line.amount,
            }))
          : item.category === "investment_saving"
            ? [
                { title: "Short-term", amount: 0 },
                { title: "Long-term", amount: 0 },
              ]
            : [];
      for (const line of lineTitles) {
        await db.insert(goals).values({
          id: crypto.randomUUID(),
          userId: user.id,
          type: "financial",
          title: line.title,
          periodStart: period.start,
          periodEnd: period.end,
          targetValue: line.amount,
          status: "active",
          parentGoalId: categoryId,
          category: item.category,
          allocationPercent: null,
          createdAt: new Date(),
        });
      }
      if (item.category === "bills") {
        await syncBillsCategoryTarget(user.id, categoryId);
      }
    }
  }

  refresh();
}

export async function logEntry(formData: FormData) {
  const user = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || "Log";
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const planned = numberFrom(formData, "planned") ?? 0;
  const actual = numberFrom(formData, "actual");
  const occurredOnRaw = String(formData.get("occurredOn") ?? "");
  const occurredOn = isISODate(occurredOnRaw) ? occurredOnRaw : null;
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
    comment,
    occurredOn,
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

export async function saveFinancialBudget(formData: FormData) {
  const user = await requireUser();
  const parentId = String(formData.get("parentId") ?? "");
  const income = numberFrom(formData, "income") ?? 0;
  if (!parentId || income < 0) return;

  const parent = await db.query.goals.findFirst({
    where: and(eq(goals.id, parentId), eq(goals.userId, user.id)),
  });
  if (!parent || parent.type !== "financial" || parent.parentGoalId) return;

  const children = await db.query.goals.findMany({
    where: and(eq(goals.parentGoalId, parentId), eq(goals.userId, user.id)),
  });

  let spendTotal = 0;
  for (const child of children) {
    if (child.category === "source") {
      await db
        .update(goals)
        .set({ targetValue: income, allocationPercent: null })
        .where(eq(goals.id, child.id));
      continue;
    }
    const percent = allocationPercentFrom(formData, `pct_${child.category}`);
    const amount = numberFrom(formData, `amt_${child.category}`);
    let allocated = child.targetValue;
    if (amount != null && amount > 0) {
      allocated = amount;
    } else if (percent != null && income > 0) {
      allocated = Math.round(income * percent) / 100;
    } else if (amount != null && amount >= 0) {
      allocated = amount;
    }
    spendTotal += allocated;
    await db
      .update(goals)
      .set({
        allocationPercent: percent,
        targetValue: allocated,
      })
      .where(eq(goals.id, child.id));
  }

  await db
    .update(goals)
    .set({ targetValue: spendTotal > 0 ? spendTotal : income })
    .where(and(eq(goals.id, parentId), eq(goals.userId, user.id)));
  refresh();
}

export async function addFinancialLineItem(formData: FormData) {
  const user = await requireUser();
  const parentId = String(formData.get("parentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const target = numberFrom(formData, "target") ?? 0;
  if (!parentId || !title || target < 0) return;

  const parent = await db.query.goals.findFirst({
    where: and(eq(goals.id, parentId), eq(goals.userId, user.id)),
  });
  if (!parent || parent.status === "archived") return;

  await db.insert(goals).values({
    id: crypto.randomUUID(),
    userId: user.id,
    type: "financial",
    title,
    periodStart: parent.periodStart,
    periodEnd: parent.periodEnd,
    targetValue: target,
    status: "active",
    parentGoalId: parent.id,
    category: parent.category,
    allocationPercent: null,
    createdAt: new Date(),
  });
  await syncBillsCategoryTarget(user.id, parent.id);
  refresh();
}

export async function updateGoalTarget(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const target = numberFrom(formData, "target");
  const title = String(formData.get("title") ?? "").trim();
  if (!id || target === null || target < 0) return;
  await db
    .update(goals)
    .set({
      targetValue: target,
      ...(title ? { title } : {}),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  const updated = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, user.id)),
  });
  if (updated?.parentGoalId) {
    await syncBillsCategoryTarget(user.id, updated.parentGoalId);
  }
  refresh();
}

async function syncBillsCategoryTarget(userId: string, billsId: string) {
  const bills = await db.query.goals.findFirst({
    where: and(eq(goals.id, billsId), eq(goals.userId, userId)),
  });
  if (!bills || bills.category !== "bills") return;
  const lines = await db.query.goals.findMany({
    where: and(eq(goals.parentGoalId, bills.id), eq(goals.userId, userId)),
  });
  const sum = lines
    .filter((line) => line.status !== "archived")
    .reduce((total, line) => total + line.targetValue, 0);
  await db
    .update(goals)
    .set({ targetValue: sum })
    .where(and(eq(goals.id, bills.id), eq(goals.userId, userId)));
}

async function cloneGoalTree(
  sourceId: string,
  userId: string,
  newParentId: string | null,
  period: { start: string; end: string },
) {
  const source = await db.query.goals.findFirst({
    where: and(eq(goals.id, sourceId), eq(goals.userId, userId)),
  });
  if (!source) return;
  const newId = crypto.randomUUID();
  await db.insert(goals).values({
    ...source,
    id: newId,
    parentGoalId: newParentId,
    periodStart: period.start,
    periodEnd: period.end,
    status: "active",
    createdAt: new Date(),
  });
  const children = await db.query.goals.findMany({
    where: and(eq(goals.parentGoalId, source.id), eq(goals.userId, userId)),
  });
  for (const child of children) {
    await cloneGoalTree(child.id, userId, newId, period);
  }
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
  await cloneGoalTree(parent.id, user.id, null, next);
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
      allocationPercent: null,
      createdAt: new Date(),
    });
  }
  refresh();
}
