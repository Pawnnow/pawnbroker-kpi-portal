import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { LogOut, Upload, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKpiData, getMonthName, formatCurrency } from "@/hooks/useKpiData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
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
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const KpiDashboard = () => {
  const navigate = useNavigate();
  const { data: kpiData, isLoading, error } = useKpiData();
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!kpiData) return [];
    if (!dateRange.from && !dateRange.to) return kpiData;

    return kpiData.filter(d => {
      const entryDate = new Date(d.year, d.month - 1, 1);
      if (dateRange.from && entryDate < dateRange.from) return false;
      if (dateRange.to) {
        const endOfMonth = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth() + 1, 0);
        if (entryDate > endOfMonth) return false;
      }
      return true;
    });
  }, [kpiData, dateRange]);

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
        // Use field_label directly without transformation
        const label = d.field_label;
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
            {/* Date Range Filter */}
            <div className="flex justify-end">
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
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
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
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
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <BarChart data={monthlyComparisons} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                        <Pie
                          data={marketingBreakdown}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          nameKey="name"
                          label={({ cx, cy, midAngle, outerRadius, name, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius * 1.35;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            const percentText = `${(percent * 100).toFixed(0)}%`;
                            
                            // Split long names into two lines
                            const words = name.split(' ');
                            let line1 = '';
                            let line2 = '';
                            
                            if (words.length > 2) {
                              const midpoint = Math.ceil(words.length / 2);
                              line1 = words.slice(0, midpoint).join(' ');
                              line2 = words.slice(midpoint).join(' ') + ' ' + percentText;
                            } else {
                              line1 = name;
                              line2 = percentText;
                            }
                            
                            return (
                              <text
                                x={x}
                                y={y}
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                className="fill-foreground text-xs"
                              >
                                <tspan x={x} dy="-0.5em">{line1}</tspan>
                                <tspan x={x} dy="1.2em">{line2}</tspan>
                              </text>
                            );
                          }}
                          labelLine={true}
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
