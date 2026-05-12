import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiFieldConfig } from "@/hooks/useKpiFieldConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const COLUMN_OPTIONS: { value: string; label: string }[] = [
  { value: "pawn_performance", label: "Pawn Performance" },
  { value: "merchandise_performance", label: "Retail and Inventory" },
  { value: "financial_summary", label: "Financial Summary" },
  { value: "customer_marketing", label: "Customer & Marketing" },
];

const COLUMN_LABELS: Record<string, string> = COLUMN_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>
);

const KPI_CATEGORIES = new Set(["pawn", "merchandise", "marketing"]);

const GRID_SECTION_LABELS: Record<string, string> = {
  aged_inventory: "Aged Inventory Columns",
  pawn_balance: "Pawn Balance Breakdown Grid",
  aged_inventory_row: "Aged Inventory Rows (Mandatory)",
};

const GRID_SECTION_ORDER = ["aged_inventory", "pawn_balance", "aged_inventory_row"];

const FieldVisibilityManager = () => {
  const { data: fields, isLoading } = useKpiFieldConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Group KPI fields by their column_group; group grid fields by their category.
  const { kpiByColumn, gridByCategory } = useMemo(() => {
    const k: Record<string, typeof fields> = {};
    const g: Record<string, typeof fields> = {};
    if (!fields) return { kpiByColumn: k, gridByCategory: g };
    fields.forEach((f) => {
      if (KPI_CATEGORIES.has(f.category)) {
        const col = f.column_group ?? "pawn_performance";
        if (!k[col]) k[col] = [];
        k[col]!.push(f);
      } else {
        if (!g[f.category]) g[f.category] = [];
        g[f.category]!.push(f);
      }
    });
    return { kpiByColumn: k, gridByCategory: g };
  }, [fields]);

  const toggleField = async (fieldName: string, newValue: boolean) => {
    const { error } = await supabase
      .from("kpi_field_config")
      .update({ is_visible: newValue })
      .eq("field_name", fieldName);

    if (error) {
      toast({ title: "Error", description: "Failed to update field visibility.", variant: "destructive" });
      return;
    }

    queryClient.setQueryData(["kpi-field-config"], (old: any[] | undefined) =>
      old?.map((f) => (f.field_name === fieldName ? { ...f, is_visible: newValue, ...(newValue === false && { is_required: false }) } : f))
    );
  };

  const toggleRequired = async (fieldName: string, newValue: boolean) => {
    const { error } = await supabase
      .from("kpi_field_config")
      .update({ is_required: newValue } as any)
      .eq("field_name", fieldName);

    if (error) {
      toast({ title: "Error", description: "Failed to update field requirement.", variant: "destructive" });
      return;
    }

    queryClient.setQueryData(["kpi-field-config"], (old: any[] | undefined) =>
      old?.map((f) => (f.field_name === fieldName ? { ...f, is_required: newValue } : f))
    );
  };

  const setColumnGroup = async (fieldName: string, newValue: string) => {
    const { error } = await supabase
      .from("kpi_field_config")
      .update({ column_group: newValue } as any)
      .eq("field_name", fieldName);

    if (error) {
      toast({ title: "Error", description: "Failed to update field column.", variant: "destructive" });
      return;
    }

    queryClient.setQueryData(["kpi-field-config"], (old: any[] | undefined) =>
      old?.map((f) => (f.field_name === fieldName ? { ...f, column_group: newValue } : f))
    );
  };

  const toggleGroupAll = async (groupFields: NonNullable<typeof fields>) => {
    const allVisible = groupFields.every((f) => f.is_visible);
    const newValue = !allVisible;

    const { error } = await supabase
      .from("kpi_field_config")
      .update({ is_visible: newValue })
      .in("field_name", groupFields.map((f) => f.field_name));

    if (error) {
      toast({ title: "Error", description: "Failed to update group visibility.", variant: "destructive" });
      return;
    }

    const fieldNames = new Set(groupFields.map((f) => f.field_name));
    queryClient.setQueryData(["kpi-field-config"], (old: any[] | undefined) =>
      old?.map((f) => (fieldNames.has(f.field_name) ? { ...f, is_visible: newValue } : f))
    );
  };

  const renderFieldRow = (field: NonNullable<typeof fields>[number], showColumnSelect: boolean) => (
    <div
      key={field.field_name}
      className="flex items-center justify-between py-1 gap-3"
    >
      <Label className="text-sm font-normal flex-1 min-w-0 truncate">{field.field_label}</Label>
      <div className="flex items-center gap-4 flex-shrink-0">
        {showColumnSelect && field.is_visible && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Column</Label>
            <Select
              value={field.column_group ?? "pawn_performance"}
              onValueChange={(v) => setColumnGroup(field.field_name, v)}
            >
              <SelectTrigger className="h-8 w-[210px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {COLUMN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {field.is_visible && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Required</Label>
            <Switch
              checked={field.is_required}
              onCheckedChange={(checked) => toggleRequired(field.field_name, checked)}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Visible</Label>
          <Switch
            checked={field.is_visible}
            onCheckedChange={(checked) => toggleField(field.field_name, checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderGroup = (
    key: string,
    title: string,
    groupFields: NonNullable<typeof fields>,
    showColumnSelect: boolean,
  ) => {
    const visibleCount = groupFields.filter((f) => f.is_visible).length;
    const requiredCount = groupFields.filter((f) => f.is_visible && f.is_required).length;
    const allVisible = visibleCount === groupFields.length;
    return (
      <Collapsible key={key} defaultOpen={false}>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {visibleCount}/{groupFields.length} visible{requiredCount > 0 && `, ${requiredCount} required`}
            </span>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">All</Label>
            <Switch
              checked={allVisible}
              onCheckedChange={() => toggleGroupAll(groupFields)}
            />
          </div>
        </div>
        <CollapsibleContent>
          <div className="pl-6 pr-3 py-2 space-y-2">
            {groupFields.map((field) => renderFieldRow(field, showColumnSelect))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground text-center">Loading field configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5" />
          KPI Field Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle which fields are shown on the KPI Upload page and which column they appear in. Hidden fields won't appear for clients but existing data is preserved.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {COLUMN_OPTIONS.map((opt) => {
          const groupFields = kpiByColumn[opt.value];
          if (!groupFields || groupFields.length === 0) return null;
          return renderGroup(opt.value, opt.label, groupFields, true);
        })}
        {GRID_SECTION_ORDER.map((cat) => {
          const groupFields = gridByCategory[cat];
          if (!groupFields || groupFields.length === 0) return null;
          return renderGroup(cat, GRID_SECTION_LABELS[cat] || cat, groupFields, false);
        })}
      </CardContent>
    </Card>
  );
};

export default FieldVisibilityManager;
