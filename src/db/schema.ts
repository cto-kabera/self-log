import { doublePrecision, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  targetValue: doublePrecision("target_value").notNull(),
  status: text("status").notNull().default("active"),
  parentGoalId: uuid("parent_goal_id"),
  category: text("category"),
  allocationPercent: doublePrecision("allocation_percent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const entries = pgTable("entries", {
  id: uuid("id").primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  label: text("label").notNull(),
  plannedAmount: doublePrecision("planned_amount").notNull(),
  actualAmount: doublePrecision("actual_amount").notNull(),
  comment: text("comment"),
  occurredOn: text("occurred_on"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
});
