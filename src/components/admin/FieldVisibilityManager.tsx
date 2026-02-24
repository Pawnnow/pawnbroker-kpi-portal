import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiFieldConfig } from "@/hooks/useKpiFieldConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  pawn: "Pawn KPIs",
  merchandise: "Merchandise KPIs",
  marketing: "Marketing KPIs",
  aged_inventory: "Aged Inventory Columns",
  pawn_balance: "Pawn Balance Breakdown Grid",
};

const CATEGORY_ORDER = ["pawn", "merchandise", "marketing", "aged_inventory", "pawn_balance"];

const FieldVisibilityManager = () => {
  const { data: fields, isLoading } = useKpiFieldConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const grouped = useMemo(() => {
    if (!fields) return {};
    const map: Record<string, typeof fields> = {};
    fields.forEach((f) => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return map;
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
      old?.map((f) => (f.field_name === fieldName ? { ...f, is_visible: newValue } : f))
    );
  };

  const toggleCategory = async (category: string) => {
    const categoryFields = grouped[category];
    if (!categoryFields) return;

    const allVisible = categoryFields.every((f) => f.is_visible);
    const newValue = !allVisible;

    const { error } = await supabase
      .from("kpi_field_config")
      .update({ is_visible: newValue })
      .in("field_name", categoryFields.map((f) => f.field_name));

    if (error) {
      toast({ title: "Error", description: "Failed to update category visibility.", variant: "destructive" });
      return;
    }

    queryClient.setQueryData(["kpi-field-config"], (old: any[] | undefined) =>
      old?.map((f) =>
        f.category === category ? { ...f, is_visible: newValue } : f
      )
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
          Toggle which fields are shown on the KPI Upload page. Hidden fields won't appear for clients but existing data is preserved.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORY_ORDER.map((category) => {
          const categoryFields = grouped[category];
          if (!categoryFields) return null;

          const visibleCount = categoryFields.filter((f) => f.is_visible).length;
          const allVisible = visibleCount === categoryFields.length;

          return (
            <Collapsible key={category} defaultOpen={false}>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  <span className="font-medium text-sm">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {visibleCount}/{categoryFields.length} visible
                  </span>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">All</Label>
                  <Switch
                    checked={allVisible}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                </div>
              </div>
              <CollapsibleContent>
                <div className="pl-6 pr-3 py-2 space-y-2">
                  {categoryFields.map((field) => (
                    <div
                      key={field.field_name}
                      className="flex items-center justify-between py-1"
                    >
                      <Label className="text-sm font-normal">{field.field_label}</Label>
                      <Switch
                        checked={field.is_visible}
                        onCheckedChange={(checked) => toggleField(field.field_name, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FieldVisibilityManager;
