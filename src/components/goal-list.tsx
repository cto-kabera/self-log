import { archiveGoal, createGoal, logGoalProgress } from "@/actions/goals";
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
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { GoalWithProgress } from "@/lib/goals";

export function NewGoalForm() {
  return (
    <form action={createGoal} className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="goal-name">Goal</Label>
        <Input
          id="goal-name"
          name="name"
          required
          maxLength={80}
          placeholder="Read 12 books this year"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="goal-target">Target</Label>
        <Input
          id="goal-target"
          name="target"
          type="number"
          min={1}
          step={1}
          required
          placeholder="12"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="goal-unit">Unit</Label>
        <Input id="goal-unit" name="unit" maxLength={24} placeholder="books" />
      </div>
      <Button type="submit">Add goal</Button>
    </form>
  );
}

function formatAmount(amount: number, unit: string | null) {
  const abs = Math.abs(amount);
  const label = unit ? `${abs} ${unit}` : String(abs);
  return amount < 0 ? `−${label}` : label;
}

export function GoalList({
  goals,
  compact = false,
}: {
  goals: GoalWithProgress[];
  compact?: boolean;
}) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active goals</CardTitle>
          <CardDescription>
            Set a number you can count. Log a little whenever you move it forward.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allDone = goals.every((item) => item.complete);

  return (
    <div className="grid gap-3">
      {allDone ? (
        <p className="text-sm text-muted-foreground">
          Every active goal is at its target. Add another, or keep logging extra.
        </p>
      ) : null}
      {goals.map((item) => (
        <Card key={item.id}>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>
                  {item.current} / {item.target}
                  {item.unit ? ` ${item.unit}` : ""}
                  {item.complete
                    ? " — target reached"
                    : ` · ${item.remaining} to go`}
                </CardDescription>
              </div>
              {item.complete ? <Badge>Done</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <Progress value={item.percent}>
              <ProgressLabel>Progress</ProgressLabel>
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                {item.percent}%
              </span>
            </Progress>
            <form
              action={logGoalProgress}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="goalId" value={item.id} />
              <div className="grid gap-2 sm:w-28">
                <Label htmlFor={`amount-${item.id}`}>Log</Label>
                <Input
                  id={`amount-${item.id}`}
                  name="amount"
                  type="number"
                  required
                  defaultValue={1}
                />
              </div>
              {compact ? null : (
                <div className="grid flex-1 gap-2">
                  <Label htmlFor={`note-${item.id}`}>Note</Label>
                  <Input
                    id={`note-${item.id}`}
                    name="note"
                    maxLength={120}
                    placeholder="Optional"
                  />
                </div>
              )}
              <Button type="submit">Add progress</Button>
            </form>
            {!compact && item.recent.length > 0 ? (
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {item.recent.map((log) => (
                  <li key={log.id}>
                    {log.amount > 0 ? "+" : ""}
                    {formatAmount(log.amount, item.unit)}
                    {log.note ? ` · ${log.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {compact ? null : (
              <form action={archiveGoal}>
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
