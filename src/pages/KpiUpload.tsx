import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MonthSelector from "@/components/kpi/MonthSelector";
import KpiInputColumn from "@/components/kpi/KpiInputColumn";
import DataGrid from "@/components/kpi/DataGrid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LogOut, Download, BarChart3 } from "lucide-react";

const PAWN_KPIS = [
  { name: "ending_pawn_balance", label: "Ending Pawn Balance" },
  { name: "num_pawns_end", label: "# of pawns in at end of" },
  { name: "dollar_pawns_written", label: "$ Pawns Written in" },
  { name: "num_pawns_written", label: "# Pawns Written in" },
  { name: "dollar_pawns_redeemed", label: "$ Pawns Redeemed in" },
  { name: "num_pawns_redeemed", label: "# Pawns Redeemed in" },
  { name: "dollar_pawns_defaulted", label: "$ pawns defaulted in" },
  { name: "num_pawns_defaulted", label: "# Pawns defaulted in" },
  { name: "psc_collected", label: "PSC collected in" },
  { name: "num_pawns_renewed_30d", label: "# Pawns renewed in past 30 days" },
  { name: "dollar_pawns_renewed_30d", label: "$ Pawns renewed in past 30 days" },
  { name: "num_buys_30d", label: "# Buys in past 30 days" },
  { name: "dollar_buys_30d", label: "$ Buys in past 30 days" },
  { name: "default_rate_dollar", label: "Default Rate in $" },
  { name: "default_rate_num", label: "Default Rate in # of pawns" },
  { name: "num_active_pawns", label: "# active Pawns" },
  { name: "avg_pawn", label: "Avg Pawn" },
  { name: "psc_30d", label: "PSC last 30 days" },
  { name: "num_pawn_customers", label: "# Pawn Customers in" },
  { name: "unique_pawn_customers", label: "Unique Pawn customers" },
  { name: "avg_pawn_balance_per_customer", label: "Avg Pawn balance per customer" },
];

const MERCHANDISE_KPIS = [
  { name: "layaway_balance", label: "Layaway Balance" },
  { name: "num_active_layaways", label: "# active layaways" },
  { name: "dollar_new_layaways", label: "$$ New Layways written in" },
  { name: "num_new_layaways", label: "# New Layaways written in" },
  { name: "dollar_redeemed_layaways", label: "$$ Redeeemed Layaways in" },
  { name: "num_redeemed_layaways", label: "# Redeemed Layaways in" },
  { name: "num_sales_transactions_30d", label: "# sales transactions past 30 days" },
  { name: "retail_sales", label: "Retail Sales" },
  { name: "gross_sales", label: "Gross Sales in" },
  { name: "cogs", label: "COGS In" },
  { name: "gross_profits", label: "Gross Profits" },
  { name: "sales_transaction", label: "Sales transaction in" },
  { name: "scrap_sales", label: "Scrap Sales in" },
  { name: "cogs_scrap", label: "COGS for Scrap in" },
];

const MARKETING_KPIS = [
  { name: "marketing_text", label: "Text" },
  { name: "marketing_social_media", label: "Social Media Ads FB & Google" },
  { name: "marketing_print", label: "Print" },
  { name: "marketing_radio", label: "Radio" },
  { name: "marketing_tv", label: "TV" },
  { name: "marketing_website", label: "Website" },
  { name: "marketing_consulting", label: "Consulting" },
  { name: "total_marketing_spent", label: "Total Marketing spent for" },
  { name: "num_google_reviews", label: "# Google reviews" },
  { name: "num_buy_customers", label: "# Buy Customers in" },
  { name: "num_retail_customers", label: "# Retail Customers in" },
  { name: "customer_traffic", label: "Customer traffic thru door" },
  { name: "new_customers_30d", label: "New customers past 30 days" },
  { name: "unique_customers_30d", label: "Unique Customers past 30 days" },
  { name: "unique_customers_365d", label: "Unique Customers past 365 days" },
];

const AGED_INVENTORY_COLUMNS = ["Total", "Jewelry", "Tools", "Musical", "Games", "Firearms", "Coins Bullion", "Other"];
const AGED_INVENTORY_ROWS = ["0-90", "91-120", "121-180", "181-210", "211-365", "365+"];

const PAWN_BALANCE_COLUMNS = ["$", "QTY"];
const PAWN_BALANCE_ROWS = [
  "$0 - $100",
  "$100 - $250",
  "$251 - $500",
  "$501 - $1000",
  "$1001 - $2500",
  "$2501 - $5000",
  "$5001 plus",
  "Pawn Balance",
];

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
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

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

  const handleExportCSV = async () => {
    setIsExporting(true);
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

      if (!data || data.length === 0) {
        toast({
          title: "No data to export",
          description: "You haven't submitted any KPI data yet.",
          variant: "destructive",
        });
        return;
      }

      // Create CSV content
      const headers = ["Year", "Month", "Category", "Field Name", "Field Label", "Value", "Created At"];
      const csvRows = [
        headers.join(","),
        ...data.map(row => [
          row.year,
          row.month,
          row.category,
          `"${row.field_name}"`,
          `"${row.field_label}"`,
          `"${row.field_value || ""}"`,
          `"${row.created_at}"`
        ].join(","))
      ];
      const csvContent = csvRows.join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `kpi_data_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: "Your KPI data has been exported to CSV.",
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
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
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
    </div>
  );
};

export default KpiUpload;
