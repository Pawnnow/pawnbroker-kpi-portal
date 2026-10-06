import { Button } from "@/components/ui/button";
import type { CustomKind } from "@/lib/budgetPlanner/categories";
import type { CustomSlots } from "@/hooks/useCustomSlots";

const CustomSlotControls = ({ slots, kind, className = "" }: { slots: CustomSlots; kind: CustomKind; className?: string }) => {
  const noun = kind === "income" ? "Custom Income" : "Custom Expense";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {slots.visible[kind] < slots.max[kind] && (
        <Button type="button" size="sm" variant="outline" onClick={() => slots.add(kind)}>
          + Add {noun} ({slots.visible[kind]}/{slots.max[kind]})
        </Button>
      )}
      {slots.canHide(kind) && (
        <Button type="button" size="sm" variant="ghost" onClick={() => slots.hide(kind)}>
          Hide last empty {noun}
        </Button>
      )}
    </div>
  );
};

export default CustomSlotControls;
