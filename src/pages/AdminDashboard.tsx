import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAdminKpiData } from "@/hooks/useAdminKpiData";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, ArrowLeft, Users, Database, Calendar, Search, Shield, Trash2, AlertTriangle, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelIntegration from "@/components/kpi/ExcelIntegration";
import CreateUserForm from "@/components/admin/CreateUserForm";
import UserListExpanded from "@/components/admin/UserListExpanded";
import FieldVisibilityManager from "@/components/admin/FieldVisibilityManager";
import LocationManager from "@/components/admin/LocationManager";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: kpiData, isLoading: dataLoading, error, refetch } = useAdminKpiData();

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // Selection state for delete functionality
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

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

  // Selection handlers
  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredData.slice(0, 100).map(e => e.id);
    const allSelected = visibleIds.every(id => selectedEntries.has(id));
    
    if (allSelected) {
      setSelectedEntries(prev => {
        const newSet = new Set(prev);
        visibleIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedEntries(prev => {
        const newSet = new Set(prev);
        visibleIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEntries.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "delete_selected",
            entry_ids: Array.from(selectedEntries),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete entries");
      }

      toast({
        title: "Entries deleted",
        description: `Successfully deleted ${result.deleted_count} entries.`,
      });

      setSelectedEntries(new Set());
      refetch();
    } catch (error: any) {
      toast({
        title: "Error deleting entries",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (clearAllConfirmText !== "DELETE ALL") return;
    
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "clear_all",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to clear database");
      }

      toast({
        title: "Database cleared",
        description: `Successfully deleted ${result.deleted_count} entries.`,
      });

      setSelectedEntries(new Set());
      setClearAllConfirmText("");
      refetch();
    } catch (error: any) {
      toast({
        title: "Error clearing database",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      if (!kpiData || kpiData.length === 0) {
        toast({ title: "No data", description: "No KPI data to backup.", variant: "destructive" });
        return;
      }

      const csvHeaders = ["user_id", "user_email", "year", "month", "category", "field_name", "field_label", "field_value"];
      const csvRows = kpiData.map(entry => 
        csvHeaders.map(h => {
          const val = String((entry as any)[h] ?? "");
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(",")
      );

      const csv = [csvHeaders.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi_backup_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Backup downloaded", description: `${kpiData.length} entries exported to CSV.` });
    } catch (err: any) {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsRestoring(true);
    try {
      const csvText = await file.text();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-restore-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ csv_data: csvText }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Restore failed");

      toast({ title: "Restore complete", description: `${result.upserted} entries restored.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };


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

  const visibleData = filteredData.slice(0, 100);
  const allVisibleSelected = visibleData.length > 0 && visibleData.every(e => selectedEntries.has(e.id));

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

        {/* User Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreateUserForm />
          <UserListExpanded />
        </div>

        {/* Field Visibility Manager */}
        <FieldVisibilityManager />

        {/* Location Manager */}
        <LocationManager />

        {/* Excel Integration for Admin */}
        <ExcelIntegration />

        {/* Data Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={handleDownloadBackup}
              disabled={isBackingUp || !kpiData || kpiData.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {isBackingUp ? "Downloading..." : "Download Backup (CSV)"}
            </Button>
            <Button
              variant="outline"
              onClick={() => restoreInputRef.current?.click()}
              disabled={isRestoring}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isRestoring ? "Restoring..." : "Restore from CSV"}
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleRestoreUpload}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={selectedEntries.size === 0 || isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedEntries.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Entries?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedEntries.size} selected entries?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || summaryStats.totalEntries === 0}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Clear Entire Database?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      <strong>WARNING:</strong> This will permanently delete <strong>ALL</strong> KPI data 
                      for <strong>ALL</strong> users ({summaryStats.totalEntries.toLocaleString()} entries).
                    </p>
                    <p>This action cannot be undone.</p>
                    <div className="space-y-2">
                      <Label htmlFor="confirmDelete">Type "DELETE ALL" to confirm:</Label>
                      <Input
                        id="confirmDelete"
                        value={clearAllConfirmText}
                        onChange={(e) => setClearAllConfirmText(e.target.value)}
                        placeholder="DELETE ALL"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setClearAllConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAll}
                    disabled={clearAllConfirmText !== "DELETE ALL"}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

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
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleAllVisible}
                            aria-label="Select all visible"
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        visibleData.map((entry) => (
                          <TableRow key={entry.id} className={selectedEntries.has(entry.id) ? "bg-muted/50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEntries.has(entry.id)}
                                onCheckedChange={() => toggleEntrySelection(entry.id)}
                                aria-label={`Select entry ${entry.id}`}
                              />
                            </TableCell>
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
