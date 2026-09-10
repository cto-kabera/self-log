import { addDays, formatLocalDate, parseISODate } from "@/lib/dates";

export const GOAL_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "financial",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_STATUSES = ["active", "achieved", "missed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const CATEGORIES = [
  "bills",
  "emergency_fund",
  "investment_saving",
  "source",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isGoalType(value: string): value is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(value);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function categoryDirection(category: Category | null) {
  return category === "source" ? "income" : "expenditure";
}

export function categoryLabel(category: Category) {
  switch (category) {
    case "bills":
      return "Bills";
    case "emergency_fund":
      return "Emergency fund";
    case "investment_saving":
      return "Investment & saving";
    case "source":
      return "Income source";
  }
}

export function typeLabel(type: GoalType) {
  switch (type) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "financial":
      return "Financial";
  }
}

function startOfWeek(today: string) {
  const date = parseISODate(today);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return formatLocalDate(date);
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return formatLocalDate(new Date(year, monthIndex + 1, 0));
}

export function periodForType(
  type: GoalType,
  today: string,
  custom?: { start: string; end: string },
) {
  if (type === "financial" && custom) return custom;
  const date = parseISODate(today);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (type === "daily") {
    return { start: today, end: today };
  }
  if (type === "weekly") {
    const start = startOfWeek(today);
    return { start, end: addDays(start, 6) };
  }
  if (type === "monthly" || type === "financial") {
    const start = formatLocalDate(new Date(year, month, 1));
    return { start, end: lastDayOfMonth(year, month) };
  }
  const quarter = Math.floor(month / 3);
  const start = formatLocalDate(new Date(year, quarter * 3, 1));
  const end = lastDayOfMonth(year, quarter * 3 + 2);
  return { start, end };
}

export function nextMonthPeriod(periodStart: string) {
  const date = parseISODate(periodStart);
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  const start = formatLocalDate(date);
  const end = lastDayOfMonth(date.getFullYear(), date.getMonth());
  return { start, end };
}

export function overlapsToday(periodStart: string, periodEnd: string, today: string) {
  return periodStart <= today && today <= periodEnd;
}

export function deriveStatus(options: {
  status: string;
  periodEnd: string;
  today: string;
  target: number;
  actual: number;
}): GoalStatus {
  if (options.status === "archived") return "archived";
  if (options.today <= options.periodEnd) return "active";
  return options.actual >= options.target ? "achieved" : "missed";
}

export type GoalRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  status: string;
  parentGoalId: string | null;
  category: string | null;
};

export type EntryRecord = {
  id: string;
  goalId: string;
  label: string;
  plannedAmount: number;
  actualAmount: number;
  loggedAt: Date;
};

export function actualValue(
  goal: GoalRecord,
  allGoals: GoalRecord[],
  allEntries: EntryRecord[],
): number {
  const children = allGoals.filter(
    (item) => item.parentGoalId === goal.id && item.status !== "archived",
  );
  if (children.length > 0) {
    return children.reduce(
      (sum, child) => sum + actualValue(child, allGoals, allEntries),
      0,
    );
  }
  return allEntries
    .filter((entry) => entry.goalId === goal.id)
    .reduce((sum, entry) => sum + entry.actualAmount, 0);
}

export function plannedValue(
  goal: GoalRecord,
  allGoals: GoalRecord[],
): number {
  const children = allGoals.filter(
    (item) => item.parentGoalId === goal.id && item.status !== "archived",
  );
  if (children.length > 0) {
    return children.reduce((sum, child) => sum + plannedValue(child, allGoals), 0);
  }
  return goal.targetValue;
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}
