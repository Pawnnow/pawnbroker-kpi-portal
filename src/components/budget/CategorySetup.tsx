import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PLANNER_SCHEMAS, PlannerMode, MAX_CUSTOM_EXPENSES } from "@/lib/budgetPlanner/categories";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const CategorySetup = ({ data, mode }: { data: BudgetPlannerData; mode: PlannerMode }) => {
  const schema = PLANNER_SCHEMAS[mode];
  const sections = [
    { title: "Income", lines: schema.income },
    { title: "Monthly Expenses", lines: schema.expenses },
    { title: "Pawn Activity, Inventory & Sales Tax", lines: schema.pawn },
  ];
  return (
  <div className="space-y-6">
    <p className="text-sm text-muted-foreground">
      Rename the custom lines so they match how you track your business. Renamed lines show up everywhere in the
      planner. Calculated lines are worked out for you and cannot be renamed.
    </p>
    {sections.map((section) => (
      <div key={section.title} className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">{section.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {section.lines.filter((l) => data.isLineVisible(l.key)).map((line) => (
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
        {section.title === "Monthly Expenses" && data.visibleCustomExpenses < MAX_CUSTOM_EXPENSES && (
          <Button size="sm" variant="outline" className="mt-3" onClick={data.addCustomExpense}>
            + Add Custom Expense ({data.visibleCustomExpenses}/{MAX_CUSTOM_EXPENSES})
          </Button>
        )}
      </div>
    ))}
  </div>
  );
};

export default CategorySetup;
