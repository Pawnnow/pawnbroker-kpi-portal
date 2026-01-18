import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, User, Calendar, KeyRound, Snowflake, Play, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import EditUserDialog from "./EditUserDialog";

interface UserProfile {
  id: string;
  email: string | null;
  user_name: string | null;
  full_name: string | null;
  must_change_password: boolean | null;
  is_frozen: boolean | null;
  group: number | null;
  created_at: string | null;
}

interface UserWithRole extends UserProfile {
  isAdmin: boolean;
}

const UserList = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingUserId, setClearingUserId] = useState<string | null>(null);
  const [freezingUserId, setFreezingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // Fetch all profiles (admin can see all)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        ...profile,
        isAdmin: adminUserIds.has(profile.id),
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const handleClearPasswordFlag = async (userId: string, userName: string | null) => {
    setClearingUserId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Password flag cleared",
        description: `${userName || "User"} can now access the dashboard without changing password.`,
      });

      // Refresh the user list
      await fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error clearing password flag",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setClearingUserId(null);
    }
  };

  const handleToggleFreeze = async (userId: string, userName: string | null, currentlyFrozen: boolean) => {
    setFreezingUserId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_frozen: !currentlyFrozen })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: currentlyFrozen ? "Account unfrozen" : "Account frozen",
        description: currentlyFrozen 
          ? `${userName || "User"} can now access their account.`
          : `${userName || "User"}'s account has been frozen.`,
      });

      // Refresh the user list
      await fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error updating account status",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setFreezingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Existing Users
        </CardTitle>
        <CardDescription>
          {users.length} user{users.length !== 1 ? "s" : ""} registered in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading users...</p>
        ) : error ? (
          <p className="text-destructive text-center py-8">Error: {error}</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No users found</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={user.is_frozen ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {user.full_name || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {user.user_name || "—"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.group ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{user.email || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {user.is_frozen && (
                            <Badge variant="destructive">Frozen</Badge>
                          )}
                          {user.isAdmin && (
                            <Badge variant="default">Admin</Badge>
                          )}
                          {user.must_change_password && (
                            <Badge variant="secondary">Pending Password</Badge>
                          )}
                          {!user.isAdmin && !user.must_change_password && !user.is_frozen && (
                            <Badge variant="outline">User</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {user.created_at
                            ? format(new Date(user.created_at), "MMM d, yyyy")
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                          {user.must_change_password && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClearPasswordFlag(user.id, user.user_name || user.full_name)}
                              disabled={clearingUserId === user.id}
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                              {clearingUserId === user.id ? "Clearing..." : "Clear PW"}
                            </Button>
                          )}
                          {!user.isAdmin && (
                            <Button
                              variant={user.is_frozen ? "default" : "destructive"}
                              size="sm"
                              onClick={() => handleToggleFreeze(user.id, user.user_name || user.full_name, !!user.is_frozen)}
                              disabled={freezingUserId === user.id}
                            >
                              {user.is_frozen ? (
                                <>
                                  <Play className="w-3.5 h-3.5 mr-1.5" />
                                  {freezingUserId === user.id ? "..." : "Unfreeze"}
                                </>
                              ) : (
                                <>
                                  <Snowflake className="w-3.5 h-3.5 mr-1.5" />
                                  {freezingUserId === user.id ? "..." : "Freeze"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <EditUserDialog
          open={editingUser !== null}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          currentUserId={currentUserId}
          onSuccess={fetchUsers}
        />
      </CardContent>
    </Card>
  );
};

export default UserList;
