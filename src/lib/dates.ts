const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(isoDate: string, days: number) {
  const date = parseISODate(isoDate);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

export function weekEnding(today: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

export function weekdayLabel(isoDate: string) {
  return parseISODate(isoDate).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export function prettyDate(isoDate: string) {
  return parseISODate(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function currentStreak(completedDates: Iterable<string>, today: string) {
  const set = new Set(completedDates);
  let cursor = today;
  if (!set.has(today)) {
    cursor = addDays(today, -1);
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
