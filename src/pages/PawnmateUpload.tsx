import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MonthSelector from "@/components/kpi/MonthSelector";
import BackupExtractorTab from "@/components/kpi/BackupExtractorTab";
import OtherRequiredTab from "@/components/kpi/OtherRequiredTab";
import FilesDropdown from "@/components/FilesDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserLocations } from "@/hooks/useUserLocations";
import { useSoftwarePlatform } from "@/hooks/useSoftwarePlatform";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Shield, Store, Calculator } from "lucide-react";

const PawnmateUpload = () => {
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const { data: locations } = useUserLocations();
  const { data: profileInfo } = useSoftwarePlatform();

  const [userId, setUserId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("extractor");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const hasLocations = !!locations && locations.length > 0;

  useEffect(() => {
    if (hasLocations && !selectedLocationId) setSelectedLocationId(locations![0].id);
  }, [hasLocations, locations, selectedLocationId]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 + 10 }, (_, i) => 2022 + i);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">KPI Upload Portal</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/budget-planner")}>
              <Calculator className="w-4 h-4 mr-2" />
              Budget Planner
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
          <div className="bg-card rounded-lg border border-border p-6">
            <div className={`grid gap-6 ${hasLocations ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
              <div>
                <Label htmlFor="currency" className="mb-2 block font-bold text-foreground">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasLocations && (
                <div>
                  <Label className="mb-2 block font-bold text-foreground flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Select Store
                  </Label>
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
            </div>
          </div>

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
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="extractor">Backup Upload</TabsTrigger>
              <TabsTrigger value="other">Other Required</TabsTrigger>
            </TabsList>

            <TabsContent value="extractor" className="mt-6">
              <BackupExtractorTab
                userId={userId}
                userEmail={profileInfo?.email ?? null}
                group={profileInfo?.group ?? null}
                locations={locations ?? []}
                year={year}
                month={month}
                currency={currency}
              />
            </TabsContent>

            <TabsContent value="other" className="mt-6">
              <OtherRequiredTab
                userId={userId}
                locationId={hasLocations ? selectedLocationId || null : null}
                year={year}
                month={month}
                currency={currency}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default PawnmateUpload;
