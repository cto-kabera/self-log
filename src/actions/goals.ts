"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goal, goalEntry } from "@/db/schema";
import { requireUser } from "@/lib/session";

function revalidateTracking() {
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const target = Number(formData.get("target"));
  if (!name || !Number.isFinite(target) || target <= 0) return;

  await db.insert(goal).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name,
    target: Math.round(target),
    unit,
    createdAt: new Date(),
  });
  revalidateTracking();
}

export async function logGoalProgress(formData: FormData) {
  const user = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const amount = Number(formData.get("amount"));
  if (!goalId || !Number.isFinite(amount) || amount === 0) return;

  const owned = await db.query.goal.findFirst({
    where: and(eq(goal.id, goalId), eq(goal.userId, user.id), isNull(goal.archivedAt)),
  });
  if (!owned) return;

  await db.insert(goalEntry).values({
    id: crypto.randomUUID(),
    goalId,
    userId: user.id,
    amount: Math.round(amount),
    note,
    createdAt: new Date(),
  });
  revalidateTracking();
}

export async function archiveGoal(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(goal)
    .set({ archivedAt: new Date() })
    .where(and(eq(goal.id, id), eq(goal.userId, user.id)));
  revalidateTracking();
}
