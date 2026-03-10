import { useState, useEffect, useCallback, useRef } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import MonthSelector from "@/components/kpi/MonthSelector";
import KpiInputColumn from "@/components/kpi/KpiInputColumn";
import DataGrid from "@/components/kpi/DataGrid";

import { supabase } from "@/integrations/supabase/client";
import { CURRENCY_FIELDS, isCurrencyField, normalizeCurrencyValue } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useVisibleKpiFields } from "@/hooks/useKpiFieldConfig";
import { useUserLocations } from "@/hooks/useUserLocations";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Shield, Store, Save, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import FilesDropdown from "@/components/FilesDropdown";

const PAWN_KPIS = [
  { name: "ending_pawn_balance", label: "Ending Pawn Balance" },
  { name: "num_pawns_end", label: "# of Pawns at End of Month" },
  { name: "num_pawns_written", label: "# Pawns Written" },
  { name: "dollar_pawns_written", label: "$ Pawns Written" },
  { name: "num_pawns_redeemed", label: "# Pawns Redeemed" },
  { name: "dollar_pawns_redeemed", label: "$ Pawns Redeemed" },
  { name: "num_pawns_defaulted", label: "# Pawns Defaulted" },
  { name: "dollar_pawns_defaulted", label: "$ Pawns Defaulted" },
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
  { name: "num_new_layaways", label: "# New Layaways Written" },
  { name: "dollar_new_layaways", label: "$ New Layaways Written" },
  { name: "num_redeemed_layaways", label: "# Redeemed Layaways" },
  { name: "dollar_redeemed_layaways", label: "$ Redeemed Layaways" },
  { name: "num_sales_transactions_30d", label: "# Sales Transactions (Past 30 Days)" },
  { name: "retail_sales", label: "Retail Sales" },
  { name: "gross_sales", label: "Gross Sales" },
  { name: "cogs", label: "COGS" },
  { name: "gross_profits", label: "Gross Profits" },
  { name: "scrap_sales", label: "Scrap Sales" },
  { name: "cogs_scrap", label: "COGS for Scrap" },
  { name: "monthly_expenses", label: "Monthly Expenses" },
  { name: "net_profit", label: "Net Profit" },
  { name: "merch_inventory", label: "Merch. Inventory" },
  { name: "buy_inventory", label: "Buy Inventory" },
  { name: "layaway_inventory", label: "Layaway Inventory" },
  { name: "scrap_inventory", label: "Scrap Inventory" },
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

const PAWN_BALANCE_COLUMNS = ["QTY", "$"];
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
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [pendingFilledCount, setPendingFilledCount] = useState(0);
  const [pendingBlankCount, setPendingBlankCount] = useState(0);
  const [missingFieldsDialogOpen, setMissingFieldsDialogOpen] = useState(false);
  const [missingFieldLabels, setMissingFieldLabels] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [submissionBanner, setSubmissionBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);
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
    requiredFieldNames,
    requiredFieldLabels,
    requiredAgedRows,
    isLoading: fieldConfigLoading,
  } = useVisibleKpiFields();

  // Get user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Fetch last submitted timestamp when year/month/location changes
  useEffect(() => {
    if (!userId || !year || !month) {
      setLastSubmittedAt(null);
      return;
    }
    const fetchLastSubmitted = async () => {
      let query = supabase
        .from("kpi_entries")
        .select("updated_at")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (hasLocations && selectedLocationId) {
        query = query.eq("location_id", selectedLocationId);
      } else {
        query = query.is("location_id", null);
      }

      const { data } = await query;
      if (data && data.length > 0 && data[0].updated_at) {
        setLastSubmittedAt(new Date(data[0].updated_at).toLocaleString());
      } else {
        setLastSubmittedAt(null);
      }
    };
    fetchLastSubmitted();
  }, [userId, year, month, selectedLocationId, hasLocations]);

  // Draft key helper
  const getDraftKey = useCallback(() => {
    if (!userId || !year || !month) return null;
    const locPart = selectedLocationId || "default";
    return `kpi-draft-${userId}-${year}-${month}-${locPart}`;
  }, [userId, year, month, selectedLocationId]);

  // Auto-save draft when values change (debounced)
  useEffect(() => {
    const key = getDraftKey();
    if (!key) return;

    // Only save if there's actual data
    const hasData = [pawnValues, merchandiseValues, marketingValues, agedInventoryValues, pawnBalanceValues]
      .some(v => Object.keys(v).length > 0);
    if (!hasData) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({
          pawnValues, merchandiseValues, marketingValues,
          agedInventoryValues, pawnBalanceValues,
        }));
        setDraftStatus("Saved locally (not submitted)");
        setTimeout(() => setDraftStatus(null), 3000);
      } catch (e) {
        console.error("Failed to save draft:", e);
      }
    }, 1000);

    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [pawnValues, merchandiseValues, marketingValues, agedInventoryValues, pawnBalanceValues, getDraftKey]);

  // Restore draft when year/month/location changes
  useEffect(() => {
    const key = getDraftKey();
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const draft = JSON.parse(saved);
        setPawnValues(draft.pawnValues || {});
        setMerchandiseValues(draft.merchandiseValues || {});
        setMarketingValues(draft.marketingValues || {});
        setAgedInventoryValues(draft.agedInventoryValues || {});
        setPawnBalanceValues(draft.pawnBalanceValues || {});
        toast({ title: "Draft restored", description: "Previously saved inputs have been loaded." });
      }
    } catch (e) {
      console.error("Failed to restore draft:", e);
    }
  // Only run when the key identity changes, not on every value update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, year, month, selectedLocationId]);

  // Clear draft helper
  const clearDraft = useCallback(() => {
    const key = getDraftKey();
    if (key) {
      try { localStorage.removeItem(key); } catch {}
    }
  }, [getDraftKey]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 + 10 }, (_, i) => 2022 + i);




  const handleClear = () => {
    clearDraft();
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




  const handleSubmit = () => {
    if (!year || !month) {
      toast({
        title: "Missing information",
        description: "Please select both year and month.",
        variant: "destructive",
      });
      return;
    }

    if (hasLocations && !selectedLocationId) {
      toast({
        title: "Missing store selection",
        description: "Please select a store location.",
        variant: "destructive",
      });
      return;
    }

    // Check required fields
    const allValues = { ...pawnValues, ...merchandiseValues, ...marketingValues };
    const missing = requiredFieldNames.filter((name) => !allValues[name]?.trim());

    // Check required aged inventory rows (Total $ cell must have a value)
    const missingAgedRows = requiredAgedRows.filter((rowLabel) => {
      const key = `${rowLabel}_Total Dollar`;
      return !agedInventoryValues[key]?.trim();
    });

    const allMissing = [
      ...missing.map((name) => requiredFieldLabels[name] || name),
      ...missingAgedRows.map((row) => `Aged Inventory: ${row} (Total $)`),
    ];

    if (allMissing.length > 0) {
      setMissingFieldLabels(allMissing);
      setMissingFieldsDialogOpen(true);
      return;
    }

    // Count filled and blank fields
    const totalPossible = pawnKpis.length + merchandiseKpis.length + marketingKpis.length
      + (showAgedInventoryGrid ? visibleAgedInventoryColumns.length * AGED_INVENTORY_ROWS.length : 0)
      + (showPawnBalanceGrid ? PAWN_BALANCE_COLUMNS.length * PAWN_BALANCE_ROWS.length : 0);

    const filledKpi = Object.values({ ...pawnValues, ...merchandiseValues, ...marketingValues }).filter(v => v && v.trim() !== "").length;
    const filledAged = Object.values(agedInventoryValues).filter(v => v && v.trim() !== "").length;
    const filledPawnBal = Object.values(pawnBalanceValues).filter(v => v && v.trim() !== "").length;
    const filled = filledKpi + filledAged + filledPawnBal;
    const blank = totalPossible - filled;

    setPendingFilledCount(filled);
    setPendingBlankCount(blank);
    setConfirmDialogOpen(true);
  };

  const executeSubmit = async () => {
    setConfirmDialogOpen(false);
    }

    setIsSubmitting(true);
    setSubmissionBanner(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("[KPI Submit] Starting submission for user:", user.id, "year:", year, "month:", month);

      const entries = [];

      const locationId = hasLocations ? selectedLocationId : null;

      // Add pawn KPIs
      for (const field of PAWN_KPIS) {
        if (pawnValues[field.name]) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: field.name,
            field_label: field.label,
            field_value: CURRENCY_FIELDS.has(field.name) ? normalizeCurrencyValue(pawnValues[field.name]) : pawnValues[field.name],
            category: "pawn",
            ...(locationId && { location_id: locationId }),
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
            field_value: CURRENCY_FIELDS.has(field.name) ? normalizeCurrencyValue(merchandiseValues[field.name]) : merchandiseValues[field.name],
            category: "merchandise",
            ...(locationId && { location_id: locationId }),
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
            field_value: CURRENCY_FIELDS.has(field.name) ? normalizeCurrencyValue(marketingValues[field.name]) : marketingValues[field.name],
            category: "marketing",
            ...(locationId && { location_id: locationId }),
          });
        }
      }

      // Add aged inventory grid values (all currency)
      Object.entries(agedInventoryValues).forEach(([key, value]) => {
        if (value) {
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: key,
            field_label: key,
            field_value: normalizeCurrencyValue(value),
            category: "aged_inventory",
            ...(locationId && { location_id: locationId }),
          });
        }
      });

      // Add pawn balance grid values
      Object.entries(pawnBalanceValues).forEach(([key, value]) => {
        if (value) {
          const isCurrency = key.endsWith("_Dollar");
          entries.push({
            user_id: user.id,
            year,
            month,
            field_name: key,
            field_label: key,
            field_value: isCurrency ? normalizeCurrencyValue(value) : value,
            category: "pawn_balance",
            ...(locationId && { location_id: locationId }),
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

      console.log("[KPI Submit] Prepared", entries.length, "entries. Deleting old entries...");

      // Delete existing entries for this user/location/year/month, then insert fresh
      let deleteQuery = supabase
        .from("kpi_entries")
        .delete()
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month);
      
      if (locationId) {
        deleteQuery = deleteQuery.eq("location_id", locationId);
      } else {
        deleteQuery = deleteQuery.is("location_id", null);
      }

      // Only delete field_names we're about to insert (preserve fields not in this submission)
      const fieldNames = entries.map(e => e.field_name);
      deleteQuery = deleteQuery.in("field_name", fieldNames);

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error("[KPI Submit] Delete failed:", deleteError);
        throw deleteError;
      }

      console.log("[KPI Submit] Old entries deleted. Inserting", entries.length, "new entries...");

      const { error } = await supabase
        .from("kpi_entries")
        .insert(entries);

      if (error) {
        console.error("[KPI Submit] Insert failed:", error);
        throw error;
      }

      console.log("[KPI Submit] SUCCESS -", entries.length, "entries saved for", month + "/" + year);

      // Clear draft on success
      clearDraft();

      // Update last submitted timestamp
      setLastSubmittedAt(new Date().toLocaleString());

      // Show success dialog instead of banner
      setPendingFilledCount(entries.length);
      setSuccessDialogOpen(true);

    } catch (error) {
      console.error("[KPI Submit] Error submitting KPI data:", error);
      setSubmissionBanner({
        type: "error",
        message: `Failed to submit KPI data. Please try again. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
            <Button variant="outline" size="sm" asChild>
              <a href="/Pawn_Gorillas_KPI_Guide.pdf" download>
                <FileText className="w-4 h-4 mr-2" />
                Guide for Pawnmate Users
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              User Dashboard
            </Button>
            <FilesDropdown />
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
        <div className="space-y-8">
          {/* Store Location Selector */}
          {hasLocations && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Store className="w-5 h-5" />
                Select Store
              </h2>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a store location..." />
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
          {fieldConfigLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading fields...</p>
          ) : (
            <>
              {(() => {
                const columns = [
                  { title: "Pawn KPIs", fields: pawnKpis, values: pawnValues, onChange: (name: string, value: string) => setPawnValues({ ...pawnValues, [name]: value }), category: "pawn" as const },
                  { title: "Merchandise KPIs", fields: merchandiseKpis, values: merchandiseValues, onChange: (name: string, value: string) => setMerchandiseValues({ ...merchandiseValues, [name]: value }), category: "merchandise" as const },
                  { title: "Marketing KPIs", fields: marketingKpis, values: marketingValues, onChange: (name: string, value: string) => setMarketingValues({ ...marketingValues, [name]: value }), category: "marketing" as const },
                ].filter((col) => col.fields.length > 0);

                const gridClass = columns.length === 3
                  ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
                  : columns.length === 2
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
                  : "grid grid-cols-1 gap-6";

                return columns.length > 0 ? (
                  <div className={gridClass}>
                    {columns.map((col) => (
                      <KpiInputColumn
                        key={col.category}
                        title={col.title}
                        fields={col.fields}
                        values={col.values}
                        onChange={col.onChange}
                        category={col.category}
                      />
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Data Grids */}
              <div className="space-y-6">
                {showAgedInventoryGrid && (
                  <DataGrid
                    title="Aged Inventory Grid"
                    columns={visibleAgedInventoryColumns}
                    rows={AGED_INVENTORY_ROWS}
                    values={agedInventoryValues}
                    onChange={(key, value) => setAgedInventoryValues({ ...agedInventoryValues, [key]: value })}
                    requiredRows={requiredAgedRows}
                    requiredColumn="Total $"
                    gridPrefix="aged"
                  />
                )}
                {showPawnBalanceGrid && (
                  <DataGrid
                    title="Pawn Balance Breakdown Grid"
                    columns={PAWN_BALANCE_COLUMNS}
                    rows={PAWN_BALANCE_ROWS}
                    values={pawnBalanceValues}
                    onChange={(key, value) => setPawnBalanceValues({ ...pawnBalanceValues, [key]: value })}
                    gridPrefix="pawn_balance"
                  />
                )}
              </div>
            </>
          )}


          {/* Submission Banner */}
          {submissionBanner && (
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${
              submissionBanner.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}>
              {submissionBanner.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{submissionBanner.type === "success" ? "Data Submitted Successfully" : "Submission Failed"}</p>
                <p className="text-sm mt-1">{submissionBanner.message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSubmissionBanner(null)} className="flex-shrink-0">
                Dismiss
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 flex-wrap">
            {lastSubmittedAt && (
              <span className="text-sm text-muted-foreground flex items-center gap-1 mr-auto">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Last submitted: {lastSubmittedAt}
              </span>
            )}
            {draftStatus && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3" />
                {draftStatus}
              </span>
            )}
            {requiredFieldNames.length > 0 && (() => {
              const allValues = { ...pawnValues, ...merchandiseValues, ...marketingValues };
              const filledCount = requiredFieldNames.filter((name) => allValues[name]?.trim()).length;
              const totalRequired = requiredFieldNames.length + requiredAgedRows.length;
              const filledAged = requiredAgedRows.filter((rowLabel) => {
                const key = `${rowLabel}_Total Dollar`;
                return agedInventoryValues[key]?.trim();
              }).length;
              const totalFilled = filledCount + filledAged;
              return (
                <Badge variant={totalFilled === totalRequired ? "default" : "secondary"} className="text-xs">
                  {totalFilled}/{totalRequired} required fields filled
                </Badge>
              );
            })()}
            <Button variant="outline" onClick={handleClear} disabled={isSubmitting}>
              Clear
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </main>

      {/* Pre-submission Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              You are uploading <strong>{pendingFilledCount}</strong> values and leaving <strong>{pendingBlankCount}</strong> values blank. Please confirm your submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-submission Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Submission Successful
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingFilledCount}</strong> values uploaded. You may edit your entries at any time in the User Dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Missing Required Fields Dialog */}
      <AlertDialog open={missingFieldsDialogOpen} onOpenChange={setMissingFieldsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Your data has NOT been saved yet
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium text-foreground">
                Please fill in the following required fields before submitting:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {missingFieldLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <p className="text-sm">
                Required fields are marked with a red asterisk (<span className="text-destructive font-bold">*</span>) and have a green background.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMissingFieldsDialogOpen(false)}>
              Go back and fill in fields
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KpiUpload;
