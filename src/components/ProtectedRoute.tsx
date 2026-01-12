import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPasswordCheck?: boolean;
}

const AUTH_TIMEOUT_MS = 5000; // 5 seconds timeout

const ProtectedRoute = ({ children, skipPasswordCheck = false }: ProtectedRouteProps) => {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean | null;
    mustChangePassword: boolean | null;
    timedOut: boolean;
  }>({
    isAuthenticated: null,
    mustChangePassword: null,
    timedOut: false,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      console.log("[ProtectedRoute] Auth check timed out after 5 seconds");
      setAuthState(prev => {
        if (prev.isAuthenticated === null) {
          return { ...prev, timedOut: true };
        }
        return prev;
      });
    }, AUTH_TIMEOUT_MS);

    const checkAuth = async () => {
      console.log("[ProtectedRoute] Starting auth check...");
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("[ProtectedRoute] getSession result:", { 
          hasSession: !!session, 
          error: sessionError?.message 
        });

        // Handle session errors (invalid/missing refresh token)
        if (sessionError) {
          console.error("[ProtectedRoute] Session error, signing out:", sessionError.message);
          await supabase.auth.signOut();
          setAuthState({ isAuthenticated: false, mustChangePassword: null, timedOut: false });
          return;
        }
        
        if (!session) {
          console.log("[ProtectedRoute] No session found");
          setAuthState({ isAuthenticated: false, mustChangePassword: null, timedOut: false });
          return;
        }

        // Check if user must change password
        console.log("[ProtectedRoute] Fetching profile for user:", session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("must_change_password")
          .eq("id", session.user.id)
          .single();

        console.log("[ProtectedRoute] Profile result:", { 
          mustChangePassword: profile?.must_change_password, 
          error: profileError?.message 
        });

        // If profile fetch fails, allow access but don't require password change
        if (profileError) {
          console.warn("[ProtectedRoute] Profile fetch failed, allowing access");
          setAuthState({
            isAuthenticated: true,
            mustChangePassword: false,
            timedOut: false,
          });
          return;
        }

        setAuthState({
          isAuthenticated: true,
          mustChangePassword: profile?.must_change_password ?? false,
          timedOut: false,
        });
      } catch (error) {
        console.error("[ProtectedRoute] Unexpected error during auth check:", error);
        // On any unexpected error, sign out and redirect to login
        await supabase.auth.signOut();
        setAuthState({ isAuthenticated: false, mustChangePassword: null, timedOut: false });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[ProtectedRoute] Auth state changed:", event);
      
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({ isAuthenticated: false, mustChangePassword: null, timedOut: false });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("must_change_password")
            .eq("id", session.user.id)
            .single();

          setAuthState({
            isAuthenticated: true,
            mustChangePassword: profile?.must_change_password ?? false,
            timedOut: false,
          });
        } catch (error) {
          console.error("[ProtectedRoute] Error fetching profile on auth change:", error);
          setAuthState({
            isAuthenticated: true,
            mustChangePassword: false,
            timedOut: false,
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleResetSession = async () => {
    console.log("[ProtectedRoute] User requested session reset");
    try {
      await supabase.auth.signOut();
      // Clear any stale auth data from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("[ProtectedRoute] Error during session reset:", error);
    }
    navigate("/auth");
  };

  // Timed out - show recovery UI
  if (authState.timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold mb-2">Session Check Timed Out</h2>
          <p className="text-muted-foreground mb-6">
            We're having trouble verifying your session. This might be due to a network issue or an expired session.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/auth")} variant="default">
              Go to Login
            </Button>
            <Button onClick={handleResetSession} variant="outline">
              Reset Session & Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
