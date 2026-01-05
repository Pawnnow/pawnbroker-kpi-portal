import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import MonthSelector from "@/components/kpi/MonthSelector";
import KpiInputColumn from "@/components/kpi/KpiInputColumn";
import DataGrid from "@/components/kpi/DataGrid";
import ExcelIntegration from "@/components/kpi/ExcelIntegration";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { LogOut, Download, BarChart3, Shield } from "lucide-react";
import * as XLSX from "xlsx";

const PAWN_KPIS = [
  { name: "ending_pawn_balance", label: "Ending Pawn Balance" },
  { name: "num_pawns_end", label: "# of Pawns at End of Month" },
  { name: "dollar_pawns_written", label: "$ Pawns Written" },
  { name: "num_pawns_written", label: "# Pawns Written" },
  { name: "dollar_pawns_redeemed", label: "$ Pawns Redeemed" },
  { name: "num_pawns_redeemed", label: "# Pawns Redeemed" },
  { name: "dollar_pawns_defaulted", label: "$ Pawns Defaulted" },
  { name: "num_pawns_defaulted", label: "# Pawns Defaulted" },
  { name: "psc_collected", label: "PSC Collected" },
  { name: "num_pawns_renewed_30d", label: "# Pawns Renewed (Past 30 Days)" },
  { name: "dollar_pawns_renewed_30d", label: "$ Pawns Renewed (Past 30 Days)" },
  { name: "num_buys_30d", label: "# Buys (Past 30 Days)" },
  { name: "dollar_buys_30d", label: "$ Buys (Past 30 Days)" },
  { name: "num_active_pawns", label: "# Active Pawns" },
  { name: "num_pawn_customers", label: "# Pawn Customers" },
  { name: "unique_pawn_customers", label: "Unique Pawn Customers" },
];

const MERCHANDISE_KPIS = [
  { name: "layaway_balance", label: "Layaway Balance" },
  { name: "num_active_layaways", label: "# Active Layaways" },
  { name: "dollar_new_layaways", label: "$ New Layaways Written" },
  { name: "num_new_layaways", label: "# New Layaways Written" },
  { name: "dollar_redeemed_layaways", label: "$ Redeemed Layaways" },
  { name: "num_redeemed_layaways", label: "# Redeemed Layaways" },
  { name: "num_sales_transactions_30d", label: "# Sales Transactions (Past 30 Days)" },
  { name: "retail_sales", label: "Retail Sales" },
  { name: "gross_sales", label: "Gross Sales" },
  { name: "cogs", label: "COGS" },
  { name: "gross_profits", label: "Gross Profits" },
  { name: "scrap_sales", label: "Scrap Sales" },
  { name: "cogs_scrap", label: "COGS for Scrap" },
];

const MARKETING_KPIS = [
  { name: "marketing_text", label: "Text Marketing" },
  { name: "marketing_social_media", label: "Social Media Ads (FB & Google)" },
  { name: "marketing_print", label: "Print Marketing" },
  { name: "marketing_radio", label: "Radio Marketing" },
  { name: "marketing_tv", label: "TV Marketing" },
  { name: "marketing_website", label: "Website" },
  { name: "marketing_consulting", label: "Consulting" },
  { name: "total_marketing_spent", label: "Total Marketing Spent" },
  { name: "num_google_reviews", label: "# Google Reviews" },
  { name: "num_buy_customers", label: "# Buy Customers" },
  { name: "num_retail_customers", label: "# Retail Customers" },
  { name: "customer_traffic", label: "Customer Traffic (Through Door)" },
  { name: "new_customers_30d", label: "New Customers (Past 30 Days)" },
  { name: "unique_customers_30d", label: "Unique Customers (Past 30 Days)" },
  { name: "unique_customers_365d", label: "Unique Customers (Past 365 Days)" },
];

const AGED_INVENTORY_COLUMNS = ["Total #", "Total $", "Jewelry", "Electronics", "Tools", "Musical", "Games", "Firearms", "Coins Bullion", "Other"];
const AGED_INVENTORY_ROWS = ["0–90 Days", "91–120 Days", "121–180 Days", "181–210 Days", "211–365 Days", "365+ Days"];

const PAWN_BALANCE_COLUMNS = ["$", "QTY"];
const PAWN_BALANCE_ROWS = [
  "$0 - $100",
  "$100 - $250",
  "$251 - $500",
  "$501 - $1000",
  "$1001 - $2500",
  "$2501 - $5000",
  "$5001 plus",
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const KpiUpload = () => {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [pawnValues, setPawnValues] = useState<Record<string, string>>({});
  const [merchandiseValues, setMerchandiseValues] = useState<Record<string, string>>({});
  const [marketingValues, setMarketingValues] = useState<Record<string, string>>({});
  const [agedInventoryValues, setAgedInventoryValues] = useState<Record<string, string>>({});
  const [pawnBalanceValues, setPawnBalanceValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<{ year: number; month: number }[]>([]);
  const [selectedExportMonths, setSelectedExportMonths] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  // Fetch available months when export dialog opens
  useEffect(() => {
    if (exportDialogOpen) {
      fetchAvailableMonths();
    }
  }, [exportDialogOpen]);

  const fetchAvailableMonths = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("kpi_entries")
        .select("year, month")
        .eq("user_id", user.id);

      if (error) throw error;

      // Get unique year-month combinations
      const uniqueMonths = new Map<string, { year: number; month: number }>();
      data?.forEach(row => {
        const key = `${row.year}-${row.month}`;
        if (!uniqueMonths.has(key)) {
          uniqueMonths.set(key, { year: row.year, month: row.month });
        }
      });

      const sorted = Array.from(uniqueMonths.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setAvailableMonths(sorted);
      // Select all by default
      setSelectedExportMonths(new Set(sorted.map(m => `${m.year}-${m.month}`)));
    } catch (error) {
      console.error("Error fetching available months:", error);
    }
  };

  const toggleMonthSelection = (key: string) => {
    setSelectedExportMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleAllMonths = () => {
    if (selectedExportMonths.size === availableMonths.length) {
      setSelectedExportMonths(new Set());
    } else {
      setSelectedExportMonths(new Set(availableMonths.map(m => `${m.year}-${m.month}`)));
    }
  };

  const handleClear = () => {
    setYear(null);
    setMonth(null);
    setPawnValues({});
    setMerchandiseValues({});
    setMarketingValues({});
    setAgedInventoryValues({});
    setPawnBalanceValues({});
    toast({
      title: "Form cleared",
      description: "All fields have been reset.",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleExportExcel = async () => {
    if (selectedExportMonths.size === 0) {
      toast({
        title: "No months selected",
        description: "Please select at least one month to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportDialogOpen(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("kpi_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;

      // Filter by selected months
      const filteredData = data?.filter(row => {
        const key = `${row.year}-${row.month}`;
        return selectedExportMonths.has(key);
      });

      if (!filteredData || filteredData.length === 0) {
        toast({
          title: "No data to export",
          description: "No data found for the selected months.",
          variant: "destructive",
        });
        return;
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Group data by month
      const dataByMonth = new Map<string, typeof filteredData>();
      filteredData.forEach(row => {
        const key = `${row.year}-${row.month}`;
        if (!dataByMonth.has(key)) {
          dataByMonth.set(key, []);
        }
        dataByMonth.get(key)!.push(row);
      });

      // Sort months for consistent sheet order
      const sortedKeys = Array.from(dataByMonth.keys()).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
      });

      // Define all KPIs in order for consistent export
      const allKpis = [
        { category: "Pawn KPIs", fields: PAWN_KPIS },
        { category: "Merchandise KPIs", fields: MERCHANDISE_KPIS },
        { category: "Marketing KPIs", fields: MARKETING_KPIS },
      ];

      // Create a sheet for each month
      sortedKeys.forEach(key => {
        const monthData = dataByMonth.get(key)!;
        const [yearNum, monthNum] = key.split('-').map(Number);
        const sheetName = `${MONTH_NAMES[monthNum - 1]} ${yearNum}`;
        
        // Create a map for quick lookup
        const valueMap = new Map<string, string>();
        monthData.forEach(row => {
          valueMap.set(row.field_name, row.field_value || "");
        });

        // Build sheet data following the form structure
        const sheetData: { Category: string; Label: string; Value: string }[] = [];
        
        allKpis.forEach(({ category, fields }) => {
          fields.forEach(field => {
            sheetData.push({
              "Category": category,
              "Label": field.label,
              "Value": valueMap.get(field.name) || "",
            });
          });
        });

        // Add Aged Inventory Grid data
        AGED_INVENTORY_ROWS.forEach(row => {
          AGED_INVENTORY_COLUMNS.forEach(col => {
            const fieldName = `aged_${row}_${col}`;
            const value = valueMap.get(fieldName) || "";
            if (value) {
              sheetData.push({
                "Category": "Aged Inventory",
                "Label": `${row} - ${col}`,
                "Value": value,
              });
            }
          });
        });

        // Add Pawn Balance Grid data
        PAWN_BALANCE_ROWS.forEach(row => {
          PAWN_BALANCE_COLUMNS.forEach(col => {
            const fieldName = `pawn_balance_${row}_${col}`;
            const value = valueMap.get(fieldName) || "";
            if (value) {
              sheetData.push({
                "Category": "Pawn Balance Breakdown",
                "Label": `${row} - ${col}`,
                "Value": value,
              });
            }
          });
        });

        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
      });

      // Download file
      XLSX.writeFile(workbook, `kpi_data_export_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Export successful",
        description: `Exported KPI data for ${selectedExportMonths.size} month(s) to Excel.`,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export failed",
        description: "Failed to export KPI data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!year || !month) {
      toast({
        title: "Missing information",
        description: "Please select both year and month.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const entries = [];

      // Add pawn KPIs
      for (const field of PAWN_KPIS) {
        if (pawnValues[field.name]) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: field.name,
            field_label: field.label,
            field_value: pawnValues[field.name],
            category: "pawn",
          });
        }
      }

      // Add merchandise KPIs
      for (const field of MERCHANDISE_KPIS) {
        if (merchandiseValues[field.name]) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: field.name,
            field_label: field.label,
            field_value: merchandiseValues[field.name],
            category: "merchandise",
          });
        }
      }

      // Add marketing KPIs
      for (const field of MARKETING_KPIS) {
        if (marketingValues[field.name]) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: field.name,
            field_label: field.label,
            field_value: marketingValues[field.name],
            category: "marketing",
          });
        }
      }

      // Add aged inventory grid values
      Object.entries(agedInventoryValues).forEach(([key, value]) => {
        if (value) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: key,
            field_label: key,
            field_value: value,
            category: "aged_inventory",
          });
        }
      });

      // Add pawn balance grid values
      Object.entries(pawnBalanceValues).forEach(([key, value]) => {
        if (value) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: key,
            field_label: key,
            field_value: value,
            category: "pawn_balance",
          });
        }
      });

      if (entries.length === 0) {
        toast({
          title: "No data to submit",
          description: "Please fill in at least one field.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("kpi_entries").insert(entries);

      if (error) throw error;

      toast({
        title: "Success",
        description: `KPI data for ${month}/${year} has been submitted successfully.`,
      });

      handleClear();
    } catch (error) {
      console.error("Error submitting KPI data:", error);
      toast({
        title: "Error",
        description: "Failed to submit KPI data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">KPI Upload Portal</h1>
          <div className="flex gap-2">
            {roleData?.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Excel"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Year and Month Selection */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Reporting Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year" className="mb-2 block">Year</Label>
                <Select value={year?.toString() || ""} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="month" className="mb-2 block">Month</Label>
                <MonthSelector value={month} onChange={setMonth} />
              </div>
            </div>
          </div>

          {/* KPI Input Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KpiInputColumn
              title="Pawn KPIs"
              fields={PAWN_KPIS}
              values={pawnValues}
              onChange={(name, value) => setPawnValues({ ...pawnValues, [name]: value })}
              category="pawn"
            />
            <KpiInputColumn
              title="Merchandise KPIs"
              fields={MERCHANDISE_KPIS}
              values={merchandiseValues}
              onChange={(name, value) => setMerchandiseValues({ ...merchandiseValues, [name]: value })}
              category="merchandise"
            />
            <KpiInputColumn
              title="Marketing KPIs"
              fields={MARKETING_KPIS}
              values={marketingValues}
              onChange={(name, value) => setMarketingValues({ ...marketingValues, [name]: value })}
              category="marketing"
            />
          </div>

          {/* Data Grids */}
          <div className="space-y-6">
            <DataGrid
              title="Aged Inventory Grid"
              columns={AGED_INVENTORY_COLUMNS}
              rows={AGED_INVENTORY_ROWS}
              values={agedInventoryValues}
              onChange={(key, value) => setAgedInventoryValues({ ...agedInventoryValues, [key]: value })}
            />
            <DataGrid
              title="Pawn Balance Breakdown Grid"
              columns={PAWN_BALANCE_COLUMNS}
              rows={PAWN_BALANCE_ROWS}
              values={pawnBalanceValues}
              onChange={(key, value) => setPawnBalanceValues({ ...pawnBalanceValues, [key]: value })}
            />
          </div>

          {/* Excel Integration */}
          <ExcelIntegration />

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleClear} disabled={isSubmitting}>
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </main>

      {/* Export Month Selection Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Months to Export</DialogTitle>
            <DialogDescription>
              Choose which months you want to include in the Excel export. Each month will be on its own sheet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-64 overflow-y-auto space-y-2 py-4">
            {availableMonths.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available to export.</p>
            ) : (
              <>
                <div className="flex items-center space-x-2 pb-2 border-b border-border">
                  <Checkbox
                    id="select-all"
                    checked={selectedExportMonths.size === availableMonths.length}
                    onCheckedChange={toggleAllMonths}
                  />
                  <Label htmlFor="select-all" className="font-semibold">Select All</Label>
                </div>
                {availableMonths.map(({ year: y, month: m }) => {
                  const key = `${y}-${m}`;
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedExportMonths.has(key)}
                        onCheckedChange={() => toggleMonthSelection(key)}
                      />
                      <Label htmlFor={key}>{MONTH_NAMES[m - 1]} {y}</Label>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportExcel} disabled={selectedExportMonths.size === 0 || isExporting}>
              {isExporting ? "Exporting..." : `Export ${selectedExportMonths.size} Month(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiUpload;
