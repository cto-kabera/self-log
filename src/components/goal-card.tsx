import {
  archiveGoal,
  cloneFinancialToNextPeriod,
  logEntry,
  updateSubGoalTarget,
} from "@/actions/goals";
import { Badge } from "@/components/ui/badge";
import { FormSubmit } from "@/components/ui/button";
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
import { prettyDate } from "@/lib/dates";
import {
  categoryLabel,
  formatAmount,
  type Category,
  type GoalType,
  typeLabel,
} from "@/server/domain";
import type { PresentedGoal } from "@/server/goals";

function statusVariant(status: string) {
  if (status === "achieved") return "default" as const;
  if (status === "missed") return "destructive" as const;
  return "outline" as const;
}

export function GoalCard({
  goal,
  compact = false,
}: {
  goal: PresentedGoal;
  compact?: boolean;
}) {
  const type = goal.type as GoalType;
  const isFinancial = type === "financial" && !goal.parentGoalId;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{goal.title}</CardTitle>
            <CardDescription>
              {typeLabel(type)} · {prettyDate(goal.periodStart)}
              {goal.periodStart !== goal.periodEnd
                ? ` – ${prettyDate(goal.periodEnd)}`
                : ""}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(goal.derivedStatus)}>
            {goal.derivedStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        <Progress value={goal.percent}>
          <ProgressLabel>
            {formatAmount(goal.actual)} / {formatAmount(goal.targetValue)}
          </ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {goal.percent}%
          </span>
        </Progress>
        <p className="text-sm text-muted-foreground">
          Planned {formatAmount(goal.planned)} · variance{" "}
          {goal.variance >= 0 ? "+" : ""}
          {formatAmount(goal.variance)}
          {goal.derivedStatus === "active"
            ? ` · ${formatAmount(goal.remaining)} to target`
            : ""}
        </p>

        {goal.children.length > 0 ? (
          <div className="grid gap-3">
            {goal.children.map((child) => (
              <div key={child.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {child.category
                      ? categoryLabel(child.category as Category)
                      : child.title}
                  </p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatAmount(child.actual)} / {formatAmount(child.targetValue)}
                  </span>
                </div>
                {!compact ? (
                  <div className="mt-3 grid gap-3">
                    <form
                      action={updateSubGoalTarget}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={child.id} />
                      <div className="grid gap-1">
                        <Label htmlFor={`target-${child.id}`}>Category target</Label>
                        <Input
                          id={`target-${child.id}`}
                          name="target"
                          type="number"
                          min={0}
                          step="any"
                          defaultValue={child.targetValue}
                          className="w-32"
                        />
                      </div>
                      <FormSubmit variant="outline" size="sm">
                        Save target
                      </FormSubmit>
                    </form>
                    <LogForm goalId={child.id} />
                    {child.logs.length > 0 ? (
                      <ul className="grid gap-1 text-sm text-muted-foreground">
                        {child.logs.map((log) => (
                          <li key={log.id}>
                            {log.label}: planned {formatAmount(log.plannedAmount)},
                            actual {formatAmount(log.actualAmount)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : compact ? null : (
          <LogForm
            goalId={goal.id}
            defaultActual={type === "daily" && goal.targetValue === 1 ? 1 : undefined}
            defaultLabel={type === "daily" ? "Done" : "Progress"}
          />
        )}

        {compact ? null : (
          <div className="flex flex-wrap gap-2">
            {isFinancial ? (
              <form action={cloneFinancialToNextPeriod}>
                <input type="hidden" name="id" value={goal.id} />
                <FormSubmit variant="outline" size="sm">
                  Copy to next month
                </FormSubmit>
              </form>
            ) : null}
            <form action={archiveGoal}>
              <input type="hidden" name="id" value={goal.id} />
              <FormSubmit variant="ghost" size="sm">
                Archive
              </FormSubmit>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LogForm({
  goalId,
  defaultActual,
  defaultLabel,
}: {
  goalId: string;
  defaultActual?: number;
  defaultLabel?: string;
}) {
  return (
    <form action={logEntry} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid flex-1 gap-1">
        <Label htmlFor={`label-${goalId}`}>Entry</Label>
        <Input
          id={`label-${goalId}`}
          name="label"
          placeholder="Rent, salary, session…"
          defaultValue={defaultLabel}
        />
      </div>
      <div className="grid gap-1 sm:w-28">
        <Label htmlFor={`planned-${goalId}`}>Planned</Label>
        <Input
          id={`planned-${goalId}`}
          name="planned"
          type="number"
          step="any"
          defaultValue={0}
        />
      </div>
      <div className="grid gap-1 sm:w-28">
        <Label htmlFor={`actual-${goalId}`}>Actual</Label>
        <Input
          id={`actual-${goalId}`}
          name="actual"
          type="number"
          step="any"
          required
          defaultValue={defaultActual}
        />
      </div>
      <FormSubmit>Log</FormSubmit>
    </form>
  );
}

export function GoalList({
  goals,
  emptyTitle,
  emptyBody,
  compact = false,
}: {
  goals: PresentedGoal[];
  emptyTitle: string;
  emptyBody: string;
  compact?: boolean;
}) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyBody}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} compact={compact} />
      ))}
    </div>
  );
}
