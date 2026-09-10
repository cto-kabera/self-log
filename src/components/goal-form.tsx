import { createGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOAL_TYPES, periodForType, typeLabel } from "@/server/domain";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function NewGoalForm({
  today,
  defaultType = "daily",
  financial = false,
}: {
  today: string;
  defaultType?: "daily" | "weekly" | "monthly" | "quarterly" | "financial";
  financial?: boolean;
}) {
  const period = periodForType("financial", today);
  return (
    <form action={createGoal} className="grid gap-3">
      <input type="hidden" name="today" value={today} />
      {financial ? <input type="hidden" name="type" value="financial" /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="goal-title">Goal</Label>
          <Input
            id="goal-title"
            name="title"
            required
            maxLength={80}
            placeholder={
              financial
                ? "Monthly financial target"
                : "Morning walk, read 12 books, ship the draft…"
            }
          />
        </div>
        {financial ? null : (
          <div className="grid gap-2">
            <Label htmlFor="goal-type">Cadence</Label>
            <select
              id="goal-type"
              name="type"
              defaultValue={defaultType}
              className={selectClass}
            >
              {GOAL_TYPES.filter((type) => type !== "financial").map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="goal-target">Target</Label>
          <Input
            id="goal-target"
            name="target"
            type="number"
            min={0}
            step="any"
            required
            placeholder={financial ? "550000" : "1"}
          />
        </div>
      </div>
      {financial ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="periodStartFallback" value={period.start} />
          <input type="hidden" name="periodEndFallback" value={period.end} />
          <div className="grid gap-2">
            <Label htmlFor="period-start">Period start</Label>
            <Input
              id="period-start"
              name="periodStart"
              type="date"
              defaultValue={period.start}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="period-end">Period end</Label>
            <Input
              id="period-end"
              name="periodEnd"
              type="date"
              defaultValue={period.end}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-bills">Bills target</Label>
            <Input id="sub-bills" name="sub_bills" type="number" min={0} step="any" defaultValue={0} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-emergency">Emergency fund</Label>
            <Input
              id="sub-emergency"
              name="sub_emergency_fund"
              type="number"
              min={0}
              step="any"
              defaultValue={0}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-invest">Investment & saving</Label>
            <Input
              id="sub-invest"
              name="sub_investment_saving"
              type="number"
              min={0}
              step="any"
              defaultValue={0}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-source">Income sources</Label>
            <Input id="sub-source" name="sub_source" type="number" min={0} step="any" defaultValue={0} />
          </div>
        </div>
      ) : null}
      <Button type="submit" className="w-fit">
        {financial ? "Create financial goal" : "Add goal"}
      </Button>
    </form>
  );
}
