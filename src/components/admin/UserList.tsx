import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string | null;
  user_name: string | null;
  full_name: string | null;
  must_change_password: boolean | null;
  created_at: string | null;
}

interface UserWithRole extends UserProfile {
  isAdmin: boolean;
}

const UserList = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchUsers();
  }, []);

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
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
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
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{user.email || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {user.isAdmin && (
                            <Badge variant="default">Admin</Badge>
                          )}
                          {user.must_change_password && (
                            <Badge variant="secondary">Pending Password</Badge>
                          )}
                          {!user.isAdmin && !user.must_change_password && (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserList;
