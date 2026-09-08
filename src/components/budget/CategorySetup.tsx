import { Input } from "@/components/ui/input";
import { INCOME_LINES, EXPENSE_LINES, PAWN_LINES } from "@/lib/budgetPlanner/categories";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const SECTIONS = [
  { title: "Income", lines: INCOME_LINES },
  { title: "Monthly Expenses", lines: EXPENSE_LINES },
  { title: "Pawn Activity, Inventory & Sales Tax", lines: PAWN_LINES },
];

const CategorySetup = ({ data }: { data: BudgetPlannerData }) => (
  <div className="space-y-6">
    <p className="text-sm text-muted-foreground">
      Rename the custom lines so they match how you track your business. Renamed lines show up everywhere in the
      planner. Calculated lines are worked out for you and cannot be renamed.
    </p>
    {SECTIONS.map((section) => (
      <div key={section.title} className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">{section.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {section.lines.map((line) => (
            <div key={line.key} className="flex items-center gap-3">
              {line.renameable ? (
                <Input
                  className="h-9"
                  value={data.labels[line.key]}
                  onChange={(e) => data.setLabel(line.key, e.target.value)}
                />
              ) : (
                <span className="text-sm py-2">
                  {data.labels[line.key]}
                  {line.kind === "calc" && <span className="text-muted-foreground"> (calculated)</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default CategorySetup;
