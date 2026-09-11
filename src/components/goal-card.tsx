import {
  archiveGoal,
  cloneFinancialToNextPeriod,
  logEntry,
  saveFinancialBudget,
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
import { Textarea } from "@/components/ui/textarea";
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
            {formatAmount(goal.actual)} / {formatAmount(goal.planned || goal.targetValue)}
          </ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {goal.percent}%
          </span>
        </Progress>
        <p className="text-sm text-muted-foreground">
          {isFinancial && goal.incomePlanned != null ? (
            <>
              Income planned {formatAmount(goal.incomePlanned)}
              {goal.incomeActual != null
                ? ` · logged ${formatAmount(goal.incomeActual)}`
                : ""}
              {goal.allocationTotalPercent != null
                ? ` · allocations ${formatAmount(goal.allocationTotalPercent)}%`
                : ""}
              {goal.allocationTotalPercent != null &&
              Math.abs(goal.allocationTotalPercent - 100) > 0.05
                ? ` (${formatAmount(100 - goal.allocationTotalPercent)}% unassigned)`
                : ""}
              <br />
            </>
          ) : null}
          Spent {formatAmount(goal.actual)} of planned {formatAmount(goal.planned)} · variance{" "}
          {goal.variance >= 0 ? "+" : ""}
          {formatAmount(goal.variance)}
          {goal.derivedStatus === "active"
            ? ` · ${formatAmount(goal.remaining)} to allocation`
            : ""}
        </p>

        {isFinancial && !compact ? <BudgetForm goal={goal} /> : null}

        {goal.children.length > 0 ? (
          <div className="grid gap-3">
            {goal.children.map((child) => (
              <div key={child.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {child.category
                      ? categoryLabel(child.category as Category)
                      : child.title}
                    {child.allocationPercent != null ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {formatAmount(child.allocationPercent)}% of income
                      </span>
                    ) : null}
                  </p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatAmount(child.actual)} / {formatAmount(child.planned)}
                  </span>
                </div>
                {!compact ? (
                  <div className="mt-3 grid gap-3">
                    <LogForm
                      goalId={child.id}
                      showComment={child.category !== "source"}
                      defaultPlanned={
                        child.category !== "source" ? child.planned : undefined
                      }
                    />
                    {child.logs.length > 0 ? (
                      <ul className="grid gap-1 text-sm text-muted-foreground">
                        {child.logs.map((log) => (
                          <li key={log.id} className="grid gap-0.5">
                            <span>
                              {log.label}: planned {formatAmount(log.plannedAmount)},
                              actual {formatAmount(log.actualAmount)}
                            </span>
                            {log.comment ? (
                              <span className="text-foreground">{log.comment}</span>
                            ) : null}
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

function BudgetForm({ goal }: { goal: PresentedGoal }) {
  const income =
    goal.incomePlanned && goal.incomePlanned > 0
      ? goal.incomePlanned
      : goal.targetValue;
  const percentFor = (category: string) =>
    goal.children.find((child) => child.category === category)?.allocationPercent ?? 0;

  return (
    <form action={saveFinancialBudget} noValidate className="grid gap-3 rounded-lg border p-3">
      <input type="hidden" name="parentId" value={goal.id} />
      <p className="text-sm font-medium">Monthly budget</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor={`income-${goal.id}`}>Income</Label>
          <Input
            id={`income-${goal.id}`}
            name="income"
            type="number"
            min={0}
            step="any"
            defaultValue={income}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`pct-bills-${goal.id}`}>Bills %</Label>
          <Input
            id={`pct-bills-${goal.id}`}
            name="pct_bills"
            type="number"
            min={0}
            max={100}
            step="any"
            defaultValue={percentFor("bills")}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`pct-em-${goal.id}`}>Emergency %</Label>
          <Input
            id={`pct-em-${goal.id}`}
            name="pct_emergency_fund"
            type="number"
            min={0}
            max={100}
            step="any"
            defaultValue={percentFor("emergency_fund")}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`pct-inv-${goal.id}`}>Investment & saving %</Label>
          <Input
            id={`pct-inv-${goal.id}`}
            name="pct_investment_saving"
            type="number"
            min={0}
            max={100}
            step="any"
            defaultValue={percentFor("investment_saving")}
          />
        </div>
      </div>
      <FormSubmit variant="outline" size="sm" className="w-fit">
        Save allocations
      </FormSubmit>
    </form>
  );
}

function LogForm({
  goalId,
  defaultActual,
  defaultLabel,
  defaultPlanned,
  showComment = false,
}: {
  goalId: string;
  defaultActual?: number;
  defaultLabel?: string;
  defaultPlanned?: number;
  showComment?: boolean;
}) {
  return (
    <form action={logEntry} noValidate className="grid gap-2">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
            defaultValue={defaultPlanned ?? 0}
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
      </div>
      {showComment ? (
        <div className="grid gap-1">
          <Label htmlFor={`comment-${goalId}`}>Comment</Label>
          <Textarea
            id={`comment-${goalId}`}
            name="comment"
            maxLength={160}
            placeholder="Short note for tracking — e.g. March rent, extra groceries"
            className="min-h-16"
          />
        </div>
      ) : null}
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
