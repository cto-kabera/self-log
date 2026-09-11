import {
  addFinancialLineItem,
  logEntry,
  updateGoalTarget,
} from "@/actions/goals";
import { FormSubmit } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount } from "@/server/domain";
import type { PresentedGoal } from "@/server/goals";

export function BillsLedger({
  bills,
  today,
}: {
  bills: PresentedGoal;
  today?: string;
}) {
  const lines = bills.children;
  const targetTotal =
    bills.voteHeadTotal ??
    lines.reduce((sum, line) => sum + line.targetValue, 0);
  const spentTotal = bills.actual;
  const over = spentTotal > targetTotal && targetTotal > 0;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-4">
      <table className="w-full min-w-[36rem] border-separate border-spacing-x-3 border-spacing-y-2">
        <thead>
          <tr className="text-left text-sm text-muted-foreground">
            <th className="w-16 pb-1 font-medium" />
            <th className="pb-1 font-medium">Target</th>
            <th className="pb-1 font-medium">Vote head</th>
            <th className="pb-1 font-medium">Spent</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id} className="align-top">
              <td className="pt-2 font-medium">
                {index === 0 ? "Bills" : null}
              </td>
              <td colSpan={2}>
                <form
                  action={updateGoalTarget}
                  className="grid grid-cols-2 gap-3"
                >
                  <input type="hidden" name="id" value={line.id} />
                  <Input
                    name="target"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={line.targetValue || ""}
                    aria-label={`${line.title} target`}
                    className="h-9"
                  />
                  <div className="flex gap-1">
                    <Input
                      name="title"
                      defaultValue={line.title}
                      required
                      aria-label="Vote head"
                      className="h-9"
                    />
                    <FormSubmit variant="outline" size="sm" className="px-2">
                      Save
                    </FormSubmit>
                  </div>
                </form>
              </td>
              <td>
                <SpendCell line={line} today={today} />
              </td>
            </tr>
          ))}
          <tr className="align-middle">
            <td className="pt-3 font-medium">Total</td>
            <td className="pt-3">
              <div className="flex h-9 items-center rounded-lg border bg-muted/40 px-2.5 text-sm tabular-nums">
                {targetTotal > 0 ? formatAmount(targetTotal) : ""}
              </div>
            </td>
            <td />
            <td className="pt-3">
              <div className="flex h-9 items-center rounded-lg border bg-muted/40 px-2.5 text-sm tabular-nums">
                {spentTotal > 0 ? formatAmount(spentTotal) : ""}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <form
        action={addFinancialLineItem}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="parentId" value={bills.id} />
        <div className="grid gap-1 sm:w-32">
          <label className="text-xs text-muted-foreground" htmlFor={`new-target-${bills.id}`}>
            Target
          </label>
          <Input
            id={`new-target-${bills.id}`}
            name="target"
            type="number"
            min={0}
            step="any"
            defaultValue={0}
          />
        </div>
        <div className="grid flex-1 gap-1">
          <label className="text-xs text-muted-foreground" htmlFor={`new-head-${bills.id}`}>
            Vote head
          </label>
          <Input
            id={`new-head-${bills.id}`}
            name="title"
            required
            placeholder="Transport, school…"
          />
        </div>
        <FormSubmit variant="outline" size="sm">
          Add vote head
        </FormSubmit>
      </form>

      <p className="mt-3 text-sm text-muted-foreground">
        Type a spend when money goes out. Spent totals add up so you can check
        them against the target
        {targetTotal > 0
          ? over
            ? ` — ${formatAmount(spentTotal - targetTotal)} over.`
            : ` — ${formatAmount(Math.max(0, targetTotal - spentTotal))} left.`
          : "."}
      </p>
    </div>
  );
}

function SpendCell({
  line,
  today,
}: {
  line: PresentedGoal;
  today?: string;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex h-9 items-center rounded-lg border bg-muted/30 px-2.5 text-sm tabular-nums">
        {line.actual > 0 ? formatAmount(line.actual) : ""}
      </div>
      <form action={logEntry} noValidate className="flex gap-1">
        <input type="hidden" name="goalId" value={line.id} />
        <input type="hidden" name="label" value={line.title} />
        <input type="hidden" name="planned" value={line.targetValue} />
        {today ? <input type="hidden" name="occurredOn" value={today} /> : null}
        <Input
          name="actual"
          type="number"
          min={0}
          step="any"
          required
          placeholder=""
          aria-label={`Log spend on ${line.title}`}
          className="h-9"
        />
        <FormSubmit size="sm">Add</FormSubmit>
      </form>
    </div>
  );
}
