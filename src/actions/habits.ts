"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habit, habitCompletion } from "@/db/schema";
import { isISODate } from "@/lib/dates";
import { requireUser } from "@/lib/session";

function revalidateTracking() {
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function createHabit(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(habit).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name,
    createdAt: new Date(),
  });
  revalidateTracking();
}

export async function archiveHabit(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(habit)
    .set({ archivedAt: new Date() })
    .where(and(eq(habit.id, id), eq(habit.userId, user.id)));
  revalidateTracking();
}

export async function toggleHabitDay(formData: FormData) {
  const user = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!habitId || !isISODate(date)) return;

  const owned = await db.query.habit.findFirst({
    where: and(
      eq(habit.id, habitId),
      eq(habit.userId, user.id),
      isNull(habit.archivedAt),
    ),
  });
  if (!owned) return;

  const existing = await db.query.habitCompletion.findFirst({
    where: and(
      eq(habitCompletion.habitId, habitId),
      eq(habitCompletion.completedOn, date),
    ),
  });

  if (existing) {
    await db
      .delete(habitCompletion)
      .where(eq(habitCompletion.id, existing.id));
  } else {
    await db.insert(habitCompletion).values({
      id: crypto.randomUUID(),
      habitId,
      userId: user.id,
      completedOn: date,
    });
  }

  revalidateTracking();
}
