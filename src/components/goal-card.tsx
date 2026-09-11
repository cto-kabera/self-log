import {
  addFinancialLineItem,
  archiveGoal,
  cloneFinancialToNextPeriod,
  logEntry,
  saveFinancialBudget,
  updateGoalTarget,
} from "@/actions/goals";
import { BillsLedger } from "@/components/bills-ledger";
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
  today,
}: {
  goal: PresentedGoal;
  compact?: boolean;
  today?: string;
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
              <CategorySection
                key={child.id}
                child={child}
                compact={compact && child.category !== "bills"}
                today={today}
              />
            ))}
          </div>
        ) : compact ? null : (
          <LogForm
            goalId={goal.id}
            today={today}
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
        <div className="grid gap-1">
          <Label htmlFor={`amt-bills-${goal.id}`}>Bills amount</Label>
          <Input
            id={`amt-bills-${goal.id}`}
            name="amt_bills"
            type="number"
            min={0}
            step="any"
            defaultValue={
              goal.children.find((child) => child.category === "bills")?.targetValue ?? 0
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`amt-em-${goal.id}`}>Emergency fund amount</Label>
          <Input
            id={`amt-em-${goal.id}`}
            name="amt_emergency_fund"
            type="number"
            min={0}
            step="any"
            defaultValue={
              goal.children.find((child) => child.category === "emergency_fund")
                ?.targetValue ?? 0
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`amt-inv-${goal.id}`}>Investment & saving amount</Label>
          <Input
            id={`amt-inv-${goal.id}`}
            name="amt_investment_saving"
            type="number"
            min={0}
            step="any"
            defaultValue={
              goal.children.find((child) => child.category === "investment_saving")
                ?.targetValue ?? 0
            }
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Set amounts on the 10th (e.g. bills 160K, emergency fund 40K, investment
        350K). Percents of income are optional. Line items under bills and
        saving should add up to the category amount.
      </p>
      <FormSubmit variant="outline" size="sm" className="w-fit">
        Save this cycle’s plan
      </FormSubmit>
    </form>
  );
}

function CategorySection({
  child,
  compact,
  today,
}: {
  child: PresentedGoal;
  compact: boolean;
  today?: string;
}) {
  const isSpend = child.category !== "source";
  const isBills = child.category === "bills";
  const canSplit = child.category === "investment_saving";
  const hasLines = child.children.length > 0;

  if (isBills) {
    return <BillsLedger bills={child} today={today} />;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {child.category ? categoryLabel(child.category as Category) : child.title}
          {child.allocationPercent != null && child.allocationPercent > 0 ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatAmount(child.allocationPercent)}% of income
            </span>
          ) : null}
        </p>
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatAmount(child.actual)} / {formatAmount(child.planned)}
        </span>
      </div>
      {compact ? null : (
        <div className="mt-3 grid gap-3">
          {hasLines
            ? child.children.map((line) => (
                <div key={line.id} className="rounded-md border bg-card p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{line.title}</p>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatAmount(line.actual)} / {formatAmount(line.targetValue)}
                    </span>
                  </div>
                  <form
                    action={updateGoalTarget}
                    className="mb-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={line.id} />
                    <div className="grid min-w-40 flex-1 gap-1">
                      <Label htmlFor={`line-title-${line.id}`}>Line</Label>
                      <Input
                        id={`line-title-${line.id}`}
                        name="title"
                        defaultValue={line.title}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`line-target-${line.id}`}>Amount</Label>
                      <Input
                        id={`line-target-${line.id}`}
                        name="target"
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={line.targetValue}
                        className="w-32"
                      />
                    </div>
                    <FormSubmit variant="outline" size="sm">
                      Save
                    </FormSubmit>
                  </form>
                  <LogForm
                    goalId={line.id}
                    today={today}
                    showComment={isSpend}
                    showDate={isSpend}
                    defaultLabel={line.title}
                    defaultPlanned={line.targetValue}
                  />
                  <EntryList logs={line.logs} hideMatchingLabel={line.title} />
                </div>
              ))
            : (
                <LogForm
                  goalId={child.id}
                  today={today}
                  showComment={isSpend}
                  showDate={isSpend}
                  defaultPlanned={isSpend ? child.planned : undefined}
                />
              )}
          {canSplit ? (
            <form
              action={addFinancialLineItem}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="parentId" value={child.id} />
              <div className="grid flex-1 gap-1">
                <Label htmlFor={`new-line-${child.id}`}>Add line</Label>
                <Input
                  id={`new-line-${child.id}`}
                  name="title"
                  required
                  placeholder="Another split…"
                />
              </div>
              <div className="grid gap-1 sm:w-28">
                <Label htmlFor={`new-line-target-${child.id}`}>Amount</Label>
                <Input
                  id={`new-line-target-${child.id}`}
                  name="target"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={0}
                />
              </div>
              <FormSubmit variant="outline" size="sm">
                Add
              </FormSubmit>
            </form>
          ) : null}
          {hasLines ? null : <EntryList logs={child.logs} />}
        </div>
      )}
    </div>
  );
}

function EntryList({
  logs,
  hideMatchingLabel,
}: {
  logs: PresentedGoal["logs"];
  hideMatchingLabel?: string;
}) {
  if (logs.length === 0) return null;
  return (
    <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
      {logs.map((log) => {
        const showLabel =
          log.label && log.label !== "Log" && log.label !== hideMatchingLabel;
        return (
          <li key={log.id} className="grid gap-0.5">
            <span>
              {log.occurredOn ? `${log.occurredOn} · ` : ""}
              {showLabel ? `${log.label}: ` : ""}
              {formatAmount(log.actualAmount)}
            </span>
            {log.comment ? (
              <span className="text-foreground">{log.comment}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function LogForm({
  goalId,
  defaultActual,
  defaultLabel,
  defaultPlanned,
  showComment = false,
  showDate = false,
  spendOnly = false,
  today,
}: {
  goalId: string;
  defaultActual?: number;
  defaultLabel?: string;
  defaultPlanned?: number;
  showComment?: boolean;
  showDate?: boolean;
  spendOnly?: boolean;
  today?: string;
}) {
  return (
    <form action={logEntry} noValidate className="grid gap-2">
      <input type="hidden" name="goalId" value={goalId} />
      {spendOnly ? (
        <>
          <input type="hidden" name="label" value={defaultLabel ?? "Spend"} />
          <input type="hidden" name="planned" value={defaultPlanned ?? 0} />
        </>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {showDate ? (
          <div className="grid gap-1 sm:w-36">
            <Label htmlFor={`occurred-${goalId}`}>Day</Label>
            <Input
              id={`occurred-${goalId}`}
              name="occurredOn"
              defaultValue={today}
              placeholder="YYYY-MM-DD"
            />
          </div>
        ) : null}
        {spendOnly ? null : (
          <>
            <div className="grid flex-1 gap-1">
              <Label htmlFor={`label-${goalId}`}>Entry</Label>
              <Input
                id={`label-${goalId}`}
                name="label"
                placeholder="Rent, salary, groceries…"
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
          </>
        )}
        <div className="grid gap-1 sm:w-28">
          <Label htmlFor={`actual-${goalId}`}>
            {spendOnly ? "Amount" : "Actual"}
          </Label>
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
            placeholder="What this spend was for"
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
  today,
}: {
  goals: PresentedGoal[];
  emptyTitle: string;
  emptyBody: string;
  compact?: boolean;
  today?: string;
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
        <GoalCard key={goal.id} goal={goal} compact={compact} today={today} />
      ))}
    </div>
  );
}
