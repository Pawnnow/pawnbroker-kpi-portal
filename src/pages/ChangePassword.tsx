import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("[ChangePassword] Starting password change flow...");
      
      // 1. Get current user BEFORE password change (session is still valid)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("[ChangePassword] getUser result:", { userId: user?.id, error: userError?.message });
      
      if (userError || !user) {
        throw new Error(userError?.message || "No user found. Please sign in again.");
      }

      // 2. Update the profile FIRST while access token is still valid
      console.log("[ChangePassword] Updating profile must_change_password to false...");
      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id)
        .select();

      console.log("[ChangePassword] Profile update result:", { 
        rowsAffected: data?.length, 
        error: profileError?.message 
      });

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      // 3. Check if update actually worked (catch silent RLS failures)
      if (!data || data.length === 0) {
        console.error("[ChangePassword] Profile update returned 0 rows - possible RLS issue");
        throw new Error("Failed to update profile. You may need to sign in again.");
      }

      // 4. Now update the password (this may invalidate refresh token)
      console.log("[ChangePassword] Updating password...");
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      console.log("[ChangePassword] Password update result:", { error: updateError?.message });

      if (updateError) {
        // Rollback profile change if password update fails
        console.log("[ChangePassword] Rolling back profile change...");
        await supabase
          .from("profiles")
          .update({ must_change_password: true })
          .eq("id", user.id);
        throw updateError;
      }

      // 5. Clear all auth state to prevent stale tokens
      console.log("[ChangePassword] Signing out and clearing auth state...");
      await supabase.auth.signOut();
      
      // Clear any localStorage auth data to ensure clean state
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });

      toast({
        title: "Password changed successfully",
        description: "Please log in with your new password.",
      });

      // 6. Redirect to login page
      console.log("[ChangePassword] Redirecting to /auth...");
      navigate("/auth");
    } catch (error: any) {
      console.error("[ChangePassword] Error:", error);
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Change Your Password</CardTitle>
          <CardDescription>
            For security reasons, you must set a new password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Password must be at least 6 characters long.
            </p>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Changing Password..." : "Set New Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
