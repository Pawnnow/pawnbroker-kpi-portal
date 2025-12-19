import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useAdminKpiData } from "@/hooks/useAdminKpiData";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, ArrowLeft, Users, Database, Calendar, Search, Shield } from "lucide-react";
import { format } from "date-fns";
import ExcelIntegration from "@/components/kpi/ExcelIntegration";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: kpiData, isLoading: dataLoading, error } = useAdminKpiData();

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Get unique filter options
  const filterOptions = useMemo(() => {
    if (!kpiData) return { years: [], users: [], categories: [] };
    return {
      years: [...new Set(kpiData.map(d => d.year))].sort((a, b) => b - a),
      users: [...new Set(kpiData.map(d => d.user_email || "Unknown"))].sort(),
      categories: [...new Set(kpiData.map(d => d.category))].sort(),
    };
  }, [kpiData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!kpiData) return [];
    return kpiData.filter(entry => {
      if (yearFilter !== "all" && entry.year !== parseInt(yearFilter)) return false;
      if (monthFilter !== "all" && entry.month !== parseInt(monthFilter)) return false;
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;
      if (userFilter !== "all" && entry.user_email !== userFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.field_label.toLowerCase().includes(search) ||
          entry.field_value?.toLowerCase().includes(search) ||
          entry.user_email?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [kpiData, yearFilter, monthFilter, categoryFilter, userFilter, searchTerm]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!kpiData) return { totalEntries: 0, uniqueUsers: 0, uniqueMonths: 0 };
    const uniqueUsers = new Set(kpiData.map(d => d.user_id)).size;
    const uniqueMonths = new Set(kpiData.map(d => `${d.year}-${d.month}`)).size;
    return {
      totalEntries: kpiData.length,
      uniqueUsers,
      uniqueMonths,
    };
  }, [kpiData]);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (!roleData?.isAdmin) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You do not have administrator privileges to view this page.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              User Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalEntries.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reporting Periods</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueMonths}</div>
            </CardContent>
          </Card>
        </div>

        {/* Excel Integration for Admin */}
        <ExcelIntegration />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All User Submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="all">All Users</SelectItem>
                    {filterOptions.users.map(user => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="all">All Years</SelectItem>
                    {filterOptions.years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Month</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="all">All Months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {MONTH_NAMES[month - 1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="all">All Categories</SelectItem>
                    {filterOptions.categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            {dataLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading data...</p>
            ) : error ? (
              <p className="text-destructive text-center py-8">Error loading data</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.slice(0, 100).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.user_email}</TableCell>
                            <TableCell>{MONTH_NAMES[entry.month - 1]} {entry.year}</TableCell>
                            <TableCell className="capitalize">{entry.category}</TableCell>
                            <TableCell>{entry.field_label}</TableCell>
                            <TableCell className="text-right font-mono">
                              {entry.field_value || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredData.length > 100 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    Showing 100 of {filteredData.length} entries. Use filters or Excel export for full data.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
