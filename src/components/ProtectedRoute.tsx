import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPasswordCheck?: boolean;
}

const ProtectedRoute = ({ children, skipPasswordCheck = false }: ProtectedRouteProps) => {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean | null;
    mustChangePassword: boolean | null;
  }>({
    isAuthenticated: null,
    mustChangePassword: null,
  });
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthState({ isAuthenticated: false, mustChangePassword: null });
        return;
      }

      // Check if user must change password
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", session.user.id)
        .single();

      setAuthState({
        isAuthenticated: true,
        mustChangePassword: profile?.must_change_password ?? false,
      });
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAuthState({ isAuthenticated: false, mustChangePassword: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", session.user.id)
        .single();

      setAuthState({
        isAuthenticated: true,
        mustChangePassword: profile?.must_change_password ?? false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still loading
  if (authState.isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!authState.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Must change password and not on the change password page
  if (!skipPasswordCheck && authState.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
