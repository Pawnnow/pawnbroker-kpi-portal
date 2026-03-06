import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthSelector from "@/components/kpi/MonthSelector";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserLocations } from "@/hooks/useUserLocations";
import { useVisibleKpiFields } from "@/hooks/useKpiFieldConfig";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Shield, Pencil, Check, X, Store, BarChart3, ClipboardList } from "lucide-react";

interface KpiEntry {
  id: string;
  year: number;
  month: number;
  field_name: string;
  field_label: string;
  field_value: string | null;
  category: string;
  location_id: string | null;
}

const AGED_INVENTORY_ROWS = ["0–90 Days", "91–120 Days", "121–180 Days", "181–210 Days", "211–365 Days", "365+ Days"];
const PAWN_BALANCE_COLUMNS = ["QTY", "$"];
const PAWN_BALANCE_ROWS = ["$0 - $100", "$100 - $250", "$251 - $500", "$501 - $1000", "$1001 - $2500", "$2501 - $5000", "$5001 plus"];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TWO_DECIMAL_PATTERN = /^-?\d*\.?\d{0,2}$/;

const ClientDashboard = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingFieldName, setAddingFieldName] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const { data: locations } = useUserLocations();
  const hasLocations = locations && locations.length > 0;
  const {
    pawnKpis,
    merchandiseKpis,
    marketingKpis,
    visibleAgedInventoryColumns,
    showAgedInventoryGrid,
    showPawnBalanceGrid,
    isLoading: fieldConfigLoading,
  } = useVisibleKpiFields();

  const years = Array.from({ length: currentYear - 2022 + 10 }, (_, i) => 2022 + i);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("kpi_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month);

      if (hasLocations && selectedLocationId) {
        query = query.eq("location_id", selectedLocationId);
      } else if (!hasLocations) {
        query = query.is("location_id", null);
      }

      const { data, error } = await query.order("field_name");
      if (error) throw error;
      setEntries((data || []) as KpiEntry[]);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast({ title: "Error", description: "Failed to load entries.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [year, month, selectedLocationId]);

  const handleEdit = (entry: KpiEntry) => {
    setEditingId(entry.id);
    setEditValue(entry.field_value || "");
    setAddingFieldName(null);
  };

  const handleSave = async (entry: KpiEntry) => {
    if (editValue && !TWO_DECIMAL_PATTERN.test(editValue)) {
      toast({ title: "Validation Error", description: "Value cannot exceed 2 decimal places.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("kpi_entries")
        .update({ field_value: editValue, updated_at: new Date().toISOString() })
        .eq("id", entry.id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, field_value: editValue } : e));
      setEditingId(null);
      toast({ title: "Updated", description: `${entry.field_label} updated.` });
    } catch (error) {
      console.error("Error updating entry:", error);
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
    setAddingFieldName(null);
    setAddValue("");
  };

  const handleStartAdd = (fieldName: string) => {
    setAddingFieldName(fieldName);
    setAddValue("");
    setEditingId(null);
  };

  const handleCreate = async (fieldName: string, fieldLabel: string, category: string) => {
    if (addValue && !TWO_DECIMAL_PATTERN.test(addValue)) {
      toast({ title: "Validation Error", description: "Value cannot exceed 2 decimal places.", variant: "destructive" });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newEntry = {
        user_id: user.id,
        year,
        month,
        field_name: fieldName,
        field_label: fieldLabel,
        field_value: addValue || null,
        category,
        location_id: hasLocations && selectedLocationId ? selectedLocationId : null,
      };

      const { data, error } = await supabase
        .from("kpi_entries")
        .insert(newEntry)
        .select()
        .single();

      if (error) throw error;
      setEntries(prev => [...prev, data as KpiEntry]);
      setAddingFieldName(null);
      setAddValue("");
      toast({ title: "Created", description: `${fieldLabel} added.` });
    } catch (error) {
      console.error("Error creating entry:", error);
      toast({ title: "Error", description: "Failed to create entry.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const entryByField = new Map<string, KpiEntry>();
  entries.forEach(e => entryByField.set(e.field_name, e));

  const renderFieldRow = (fieldName: string, fieldLabel: string, category: string) => {
    const entry = entryByField.get(fieldName);

    // No entry exists — allow adding
    if (!entry) {
      if (addingFieldName === fieldName) {
        return (
          <div key={fieldName} className="flex items-center justify-between gap-2">
            <Label className="text-sm text-foreground flex-1">{fieldLabel}</Label>
            <div className="flex items-center gap-1">
              <Input
                value={addValue}
                onChange={(e) => {
                  if (e.target.value === "" || e.target.value === "-" || TWO_DECIMAL_PATTERN.test(e.target.value)) {
                    setAddValue(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate(fieldName, fieldLabel, category);
                  if (e.key === "Escape") handleCancel();
                }}
                className="w-32 text-right text-sm"
                autoFocus
                placeholder="0"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCreate(fieldName, fieldLabel, category)}>
                <Check className="w-3.5 h-3.5 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        );
      }
      return (
        <div key={fieldName} className="flex items-center justify-between gap-4">
          <Label className="text-sm text-foreground flex-1">{fieldLabel}</Label>
          <div className="flex items-center gap-1">
            <span className="w-32 text-right text-sm text-muted-foreground">—</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartAdd(fieldName)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    // Entry exists — edit mode
    return (
      <div key={fieldName} className="flex items-center justify-between gap-2">
        <Label className="text-sm text-foreground flex-1">{fieldLabel}</Label>
        {editingId === entry.id ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => {
                if (e.target.value === "" || e.target.value === "-" || TWO_DECIMAL_PATTERN.test(e.target.value)) {
                  setEditValue(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave(entry);
                if (e.key === "Escape") handleCancel();
              }}
              className="w-32 text-right text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(entry)}>
              <Check className="w-3.5 h-3.5 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="w-32 text-right text-sm text-foreground">{entry.field_value || "—"}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderKpiColumn = (title: string, fields: { name: string; label: string }[], category: string) => {
    if (fields.length === 0) return null;
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
        <div className="space-y-3">
          {fields.map(f => renderFieldRow(f.name, f.label, category))}
        </div>
      </div>
    );
  };

  const renderReadOnlyGrid = (title: string, columns: string[], rows: string[], gridCategory: string) => {
    const isAged = title.toLowerCase().includes("aged");

    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border bg-secondary p-2 text-left font-bold text-sm"></th>
                {columns.map(col => (
                  <th key={col} className="border border-border bg-secondary p-2 text-center font-bold text-sm min-w-[100px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row}>
                  <td className="border border-border bg-secondary p-2 text-left font-medium text-sm">{row}</td>
                  {columns.map(col => {
                    const sanitizedCol = col.replace('#', 'Num').replace('$', 'Dollar');
                    const fieldKey = isAged ? `aged_${row}_${sanitizedCol}` : `pawn_balance_${row}_${sanitizedCol}`;
                    const fieldLabel = `${row} - ${col}`;
                    const entry = entries.find(e => e.field_name === fieldKey);

                    const isAdding = addingFieldName === fieldKey;

                    return (
                      <td key={col} className="border border-border p-2">
                        {entry && editingId === entry.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValue}
                              onChange={(e) => {
                                if (e.target.value === "" || e.target.value === "-" || TWO_DECIMAL_PATTERN.test(e.target.value)) {
                                  setEditValue(e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave(entry);
                                if (e.key === "Escape") handleCancel();
                              }}
                              className="w-full text-right text-sm"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleSave(entry)}>
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleCancel}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : isAdding ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={addValue}
                              onChange={(e) => {
                                if (e.target.value === "" || e.target.value === "-" || TWO_DECIMAL_PATTERN.test(e.target.value)) {
                                  setAddValue(e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate(fieldKey, fieldLabel, gridCategory);
                                if (e.key === "Escape") handleCancel();
                              }}
                              className="w-full text-right text-sm"
                              autoFocus
                              placeholder="0"
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleCreate(fieldKey, fieldLabel, gridCategory)}>
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleCancel}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground w-full text-right">{entry?.field_value || "—"}</span>
                            {entry ? (
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 ml-1" onClick={() => handleEdit(entry)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 ml-1" onClick={() => handleStartAdd(fieldKey)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const columns = [
    { title: "Pawn KPIs", fields: pawnKpis, category: "pawn" },
    { title: "Merchandise KPIs", fields: merchandiseKpis, category: "merchandise" },
    { title: "Marketing KPIs", fields: marketingKpis, category: "marketing" },
  ].filter(col => col.fields.length > 0);

  const gridClass = columns.length === 3
    ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
    : columns.length === 2
    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
    : "grid grid-cols-1 gap-6";

  const hasAnyFieldConfig = columns.length > 0 || showAgedInventoryGrid || showPawnBalanceGrid;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">My Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/kpi-upload")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Upload
            </Button>
            {roleData?.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="entries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              My Entries
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hasLocations && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      <Store className="w-4 h-4 inline mr-1" /> Store
                    </label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select store..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {locations!.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.store_code} - {loc.store_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Year</label>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Month</label>
                  <MonthSelector value={month} onChange={setMonth} />
                </div>
              </div>
            </div>

            {/* Results */}
            {loading || fieldConfigLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading entries...</p>
              </div>
            ) : !hasAnyFieldConfig ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <p className="text-muted-foreground">No KPI fields configured.</p>
              </div>
            ) : (
              <>
                {columns.length > 0 && (
                  <div className={gridClass}>
                    {columns.map(col => renderKpiColumn(col.title, col.fields, col.category))}
                  </div>
                )}

                <div className="space-y-6">
                  {showAgedInventoryGrid && (
                    renderReadOnlyGrid("Aged Inventory Grid", visibleAgedInventoryColumns, AGED_INVENTORY_ROWS, "aged_inventory")
                  )}
                  {showPawnBalanceGrid && (
                    renderReadOnlyGrid("Pawn Balance Breakdown Grid", PAWN_BALANCE_COLUMNS, PAWN_BALANCE_ROWS, "pawn_balance")
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            <DashboardCharts />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDashboard;
