import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiData, getMonthName, formatCurrency } from "@/hooks/useKpiData";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const KpiDashboard = () => {
  const navigate = useNavigate();
  const { data: kpiData, isLoading, error } = useKpiData();
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Get unique years from data
  const availableYears = useMemo(() => {
    if (!kpiData) return [];
    const years = [...new Set(kpiData.map(d => d.year))].sort((a, b) => b - a);
    return years;
  }, [kpiData]);

  // Filter data by selected year
  const filteredData = useMemo(() => {
    if (!kpiData) return [];
    if (selectedYear === "all") return kpiData;
    return kpiData.filter(d => d.year === parseInt(selectedYear));
  }, [kpiData, selectedYear]);

  // Prepare pawn balance trend data
  const pawnBalanceTrend = useMemo(() => {
    const entries = filteredData.filter(d => d.field_name === "ending_pawn_balance");
    return entries.map(e => ({
      period: `${getMonthName(e.month)} ${e.year}`,
      value: formatCurrency(e.field_value),
    }));
  }, [filteredData]);

  // Prepare marketing spend breakdown
  const marketingBreakdown = useMemo(() => {
    const marketingFields = [
      "marketing_text",
      "marketing_social_media",
      "marketing_print",
      "marketing_radio",
      "marketing_tv",
      "marketing_website",
    ];
    const result: Record<string, number> = {};
    
    filteredData
      .filter(d => marketingFields.includes(d.field_name))
      .forEach(d => {
        const label = d.field_label.replace("Marketing ", "").replace("marketing_", "");
        result[label] = (result[label] || 0) + formatCurrency(d.field_value);
      });

    return Object.entries(result)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Prepare monthly comparisons
  const monthlyComparisons = useMemo(() => {
    const groupedByPeriod: Record<string, { psc: number; sales: number; defaults: number }> = {};
    
    filteredData.forEach(d => {
      const period = `${getMonthName(d.month)} ${d.year}`;
      if (!groupedByPeriod[period]) {
        groupedByPeriod[period] = { psc: 0, sales: 0, defaults: 0 };
      }
      
      if (d.field_name === "psc_collected") {
        groupedByPeriod[period].psc = formatCurrency(d.field_value);
      }
      if (d.field_name === "retail_sales") {
        groupedByPeriod[period].sales = formatCurrency(d.field_value);
      }
      if (d.field_name === "dollar_pawns_defaulted") {
        groupedByPeriod[period].defaults = formatCurrency(d.field_value);
      }
    });

    return Object.entries(groupedByPeriod).map(([period, data]) => ({
      period,
      ...data,
    }));
  }, [filteredData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const latestMonth = filteredData.reduce((acc, curr) => {
      const currPeriod = curr.year * 12 + curr.month;
      const accPeriod = acc ? acc.year * 12 + acc.month : 0;
      return currPeriod > accPeriod ? curr : acc;
    }, null as typeof filteredData[0] | null);

    if (!latestMonth) return null;

    const latestData = filteredData.filter(
      d => d.year === latestMonth.year && d.month === latestMonth.month
    );

    const getValue = (fieldName: string) => {
      const entry = latestData.find(d => d.field_name === fieldName);
      return formatCurrency(entry?.field_value || null);
    };

    return {
      pawnBalance: getValue("ending_pawn_balance"),
      pscCollected: getValue("psc_collected"),
      retailSales: getValue("retail_sales"),
      pawnCustomers: getValue("num_pawn_customers"),
      period: `${getMonthName(latestMonth.month)} ${latestMonth.year}`,
    };
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <p className="text-destructive">Error loading data. Please try again.</p>
      </div>
    );
  }

  const chartConfig = {
    psc: { label: "PSC Collected", color: "hsl(var(--primary))" },
    sales: { label: "Retail Sales", color: "hsl(var(--chart-2))" },
    defaults: { label: "Defaults", color: "hsl(var(--chart-3))" },
    value: { label: "Amount", color: "hsl(var(--primary))" },
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">KPI Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/kpi-upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Upload KPIs
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!kpiData || kpiData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No KPI data available yet.</p>
              <Button onClick={() => navigate("/kpi-upload")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First KPIs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex justify-end">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Cards */}
            {summaryStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pawn Balance
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${summaryStats.pawnBalance.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{summaryStats.period}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      PSC Collected
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${summaryStats.pscCollected.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{summaryStats.period}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Retail Sales
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${summaryStats.retailSales.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{summaryStats.period}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pawn Customers
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summaryStats.pawnCustomers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{summaryStats.period}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pawn Balance Trend */}
              {pawnBalanceTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pawn Balance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <LineChart data={pawnBalanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="period" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Comparisons */}
              {monthlyComparisons.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={monthlyComparisons}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="period" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="psc" fill="hsl(var(--primary))" name="PSC" />
                        <Bar dataKey="sales" fill="hsl(var(--chart-2))" name="Sales" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Marketing Breakdown */}
              {marketingBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Marketing Spend Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <PieChart>
                        <Pie
                          data={marketingBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {marketingBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KpiDashboard;
