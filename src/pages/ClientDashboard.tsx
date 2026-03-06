import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import MonthSelector from "@/components/kpi/MonthSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserLocations } from "@/hooks/useUserLocations";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Shield, Pencil, Trash2, Check, X, Store } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

const CATEGORY_ORDER = ["pawn", "merchandise", "marketing", "aged_inventory", "pawn_balance"];
const CATEGORY_LABELS: Record<string, string> = {
  pawn: "Pawn KPIs",
  merchandise: "Merchandise KPIs",
  marketing: "Marketing KPIs",
  aged_inventory: "Aged Inventory",
  pawn_balance: "Pawn Balance Breakdown",
};

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

  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const { data: locations } = useUserLocations();
  const hasLocations = locations && locations.length > 0;
  const queryClient = useQueryClient();

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
  };

  const handleSave = async (entry: KpiEntry) => {
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

  const handleDelete = async (entry: KpiEntry) => {
    try {
      const { error } = await supabase.from("kpi_entries").delete().eq("id", entry.id);
      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast({ title: "Deleted", description: `${entry.field_label} removed.` });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Group entries by category
  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      items: entries.filter(e => e.category === cat),
    }))
    .filter(g => g.items.length > 0);

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">My KPI Entries</h1>
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

      <main className="container mx-auto px-4 py-8 space-y-6">
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
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground">No entries found for {MONTH_NAMES[month - 1]} {year}.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/kpi-upload")}>
              Go to Upload
            </Button>
          </div>
        ) : (
          grouped.map(({ category, label, items }) => (
            <div key={category} className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">{label}</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.field_label}</TableCell>
                      <TableCell>
                        {editingId === entry.id ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(entry);
                              if (e.key === "Escape") handleCancel();
                            }}
                            className="w-40 text-right"
                            autoFocus
                          />
                        ) : (
                          <span className="text-foreground">{entry.field_value || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === entry.id ? (
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleSave(entry)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancel}>
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default ClientDashboard;
