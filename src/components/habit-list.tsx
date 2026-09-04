import { archiveHabit, createHabit, toggleHabitDay } from "@/actions/habits";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HabitWithWeek } from "@/lib/habits";
import { weekdayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function NewHabitForm() {
  return (
    <form action={createHabit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-2">
        <Label htmlFor="habit-name">New habit</Label>
        <Input
          id="habit-name"
          name="name"
          required
          maxLength={80}
          placeholder="Morning walk, no phone in bed, journal…"
        />
      </div>
      <Button type="submit">Add habit</Button>
    </form>
  );
}

export function HabitList({
  habits,
  today,
  compact = false,
}: {
  habits: HabitWithWeek[];
  today: string;
  compact?: boolean;
}) {
  if (habits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No habits yet</CardTitle>
          <CardDescription>
            Add one small daily action. Checking it off is the whole point.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {habits.map((item) => (
        <Card key={item.id}>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{item.name}</span>
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {item.streak > 0 ? `${item.streak}-day streak` : "No streak yet"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <form action={toggleHabitDay}>
              <input type="hidden" name="habitId" value={item.id} />
              <input type="hidden" name="date" value={today} />
              <Button
                type="submit"
                variant={item.doneToday ? "default" : "outline"}
                className="w-full sm:w-auto"
              >
                {item.doneToday ? "Done for today" : "Mark today done"}
              </Button>
            </form>
            <div className="grid grid-cols-7 gap-1.5">
              {item.week.map((day) => (
                <form key={day.date} action={toggleHabitDay}>
                  <input type="hidden" name="habitId" value={item.id} />
                  <input type="hidden" name="date" value={day.date} />
                  <button
                    type="submit"
                    title={day.date}
                    aria-pressed={day.done}
                    aria-label={`${item.name} on ${day.date}${day.done ? ", completed" : ""}`}
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs transition-colors",
                      day.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                      day.date === today && !day.done && "ring-2 ring-ring/40",
                    )}
                  >
                    <span className="text-[0.65rem] uppercase tracking-wide">
                      {weekdayLabel(day.date)}
                    </span>
                    <span className="tabular-nums">
                      {day.date.slice(-2)}
                    </span>
                  </button>
                </form>
              ))}
            </div>
            {compact ? null : (
              <form action={archiveHabit}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Archive
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
