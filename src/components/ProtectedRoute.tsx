import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AccountFrozenScreen from "@/components/AccountFrozenScreen";
import { useActivityTimeout } from "@/hooks/useActivityTimeout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipPasswordCheck?: boolean;
}

const AUTH_TIMEOUT_MS = 5000; // 5 seconds timeout for initial auth check

const ProtectedRoute = ({ children, skipPasswordCheck = false }: ProtectedRouteProps) => {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean | null;
    mustChangePassword: boolean | null;
    isFrozen: boolean | null;
    timedOut: boolean;
    userId: string | null;
  }>({
    isAuthenticated: null,
    mustChangePassword: null,
    isFrozen: null,
    timedOut: false,
    userId: null,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Activity-based session timeout (30 min for users, 180 min for admins)
  useActivityTimeout({
    isAuthenticated: authState.isAuthenticated === true,
    userId: authState.userId,
  });

  // Helper to safely clear the auth timeout
  const clearAuthTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

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
          clearAuthTimeout();
          setAuthState({ isAuthenticated: false, mustChangePassword: null, isFrozen: null, timedOut: false, userId: null });
          return;
        }
        
        if (!session) {
          console.log("[ProtectedRoute] No session found");
          clearAuthTimeout();
          setAuthState({ isAuthenticated: false, mustChangePassword: null, isFrozen: null, timedOut: false, userId: null });
          return;
        }

        // Check if user must change password or is frozen
        console.log("[ProtectedRoute] Fetching profile for user:", session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("must_change_password, is_frozen")
          .eq("id", session.user.id)
          .single();

        console.log("[ProtectedRoute] Profile result:", { 
          mustChangePassword: profile?.must_change_password,
          isFrozen: profile?.is_frozen,
          error: profileError?.message 
        });

        // Clear timeout before setting definitive auth state
        clearAuthTimeout();

        // If profile fetch fails, allow access but don't require password change
        if (profileError) {
          console.warn("[ProtectedRoute] Profile fetch failed, allowing access");
          setAuthState({
            isAuthenticated: true,
            mustChangePassword: false,
            isFrozen: false,
            timedOut: false,
            userId: session.user.id,
          });
          return;
        }

        setAuthState({
          isAuthenticated: true,
          mustChangePassword: profile?.must_change_password ?? false,
          isFrozen: profile?.is_frozen ?? false,
          timedOut: false,
          userId: session.user.id,
        });
      } catch (error) {
        console.error("[ProtectedRoute] Unexpected error during auth check:", error);
        // On any unexpected error, sign out and redirect to login
        await supabase.auth.signOut();
        clearAuthTimeout();
        setAuthState({ isAuthenticated: false, mustChangePassword: null, isFrozen: null, timedOut: false, userId: null });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ProtectedRoute] Auth state changed:", event);
      
      // Clear timeout on any definitive auth state change
      clearAuthTimeout();
      
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState({ isAuthenticated: false, mustChangePassword: null, isFrozen: null, timedOut: false, userId: null });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer profile fetch to avoid deadlock
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("must_change_password, is_frozen")
              .eq("id", session.user.id)
              .single();

            setAuthState({
              isAuthenticated: true,
              mustChangePassword: profile?.must_change_password ?? false,
              isFrozen: profile?.is_frozen ?? false,
              timedOut: false,
              userId: session.user.id,
            });
          } catch (error) {
            console.error("[ProtectedRoute] Error fetching profile on auth change:", error);
            setAuthState({
              isAuthenticated: true,
              mustChangePassword: false,
              isFrozen: false,
              timedOut: false,
              userId: session.user.id,
            });
          }
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearAuthTimeout();
    };
  }, [clearAuthTimeout]);

  const handleResetSession = async () => {
    console.log("[ProtectedRoute] User requested session reset");

    // Clear any stale auth data first (this can unblock signOut when storage is corrupted)
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (error) {
      console.error("[ProtectedRoute] Error clearing storage during session reset:", error);
    }

    // Best-effort signOut (don't block UI/navigation if the network is hung)
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (error) {
      console.error("[ProtectedRoute] Error during signOut in session reset:", error);
    }

    // Force a hard navigation to guarantee we leave this stuck state
    window.location.assign("/auth");
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

  // Account is frozen - show frozen screen
  if (authState.isFrozen) {
    return <AccountFrozenScreen />;
  }

  // Must change password and not on the change password page
  if (!skipPasswordCheck && authState.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
