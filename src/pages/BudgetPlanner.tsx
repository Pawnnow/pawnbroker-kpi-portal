import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Printer, Store, Loader2 } from "lucide-react";
import { useUserLocations } from "@/hooks/useUserLocations";
import { useBudgetPlanner } from "@/hooks/useBudgetPlanner";
import YearGrid from "@/components/budget/YearGrid";
import CashFlowTable from "@/components/budget/CashFlowTable";
import BudgetVsActual from "@/components/budget/BudgetVsActual";
import BudgetDashboard from "@/components/budget/BudgetDashboard";
import CategorySetup from "@/components/budget/CategorySetup";

const BudgetPlanner = () => {
  const navigate = useNavigate();
  const { data: locations } = useUserLocations();
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (locations && locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const data = useBudgetPlanner(locationId);
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Budget & Cash Flow Planner</h1>
          <div className="flex gap-2 items-center">
            {data.saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/kpi-upload")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Upload
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <p className="text-xs text-muted-foreground border border-border rounded-md p-3 bg-card">
          Pawn Gorillas Budget &amp; Cash Flow Planner — proprietary and confidential. Provided for your store's use
          only under your Pawn Gorillas membership. Not for redistribution.
        </p>

        {locations && locations.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 max-w-sm print:hidden">
            <Label className="mb-2 flex items-center gap-2 font-bold"><Store className="w-4 h-4" /> Store</Label>
            <Select value={locationId ?? ""} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Choose a store..." /></SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.store_code} - {loc.store_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {data.loading ? (
          <p className="text-muted-foreground py-12 text-center">Loading your planner…</p>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto print:hidden">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="categories">Category Setup</TabsTrigger>
              {data.years.all.map((y) => (
                <TabsTrigger key={y} value={String(y)}>
                  {y}{data.years.projected.includes(y) ? "*" : ""}
                </TabsTrigger>
              ))}
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
              <TabsTrigger value="bva">Budget vs Actual</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6"><BudgetDashboard data={data} /></TabsContent>
            <TabsContent value="categories" className="mt-6"><CategorySetup data={data} /></TabsContent>
            {data.years.all.map((y) => (
              <TabsContent key={y} value={String(y)} className="mt-6">
                <YearGrid year={y} isProjected={data.years.projected.includes(y)} data={data} />
              </TabsContent>
            ))}
            <TabsContent value="cashflow" className="mt-6"><CashFlowTable data={data} /></TabsContent>
            <TabsContent value="bva" className="mt-6"><BudgetVsActual data={data} /></TabsContent>
          </Tabs>
        )}
        <p className="text-xs text-muted-foreground">* Projected year</p>
      </main>
    </div>
  );
};

export default BudgetPlanner;
