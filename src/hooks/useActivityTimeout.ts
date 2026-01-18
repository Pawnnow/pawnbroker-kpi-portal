import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USER_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes
const ADMIN_TIMEOUT_MS = 180 * 60 * 1000; // 180 minutes (3 hours)
const WARNING_BEFORE_MS = 2 * 60 * 1000;  // Warn 2 minutes before

interface UseActivityTimeoutOptions {
  isAuthenticated: boolean;
  userId: string | null;
}

export const useActivityTimeout = ({ isAuthenticated, userId }: UseActivityTimeoutOptions) => {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const isAdminRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    console.log("[ActivityTimeout] Session expired due to inactivity");
    clearTimers();
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[ActivityTimeout] Error during logout:", error);
    }
    
    toast.info("Session expired due to inactivity");
    navigate("/auth");
  }, [clearTimers, navigate]);

  const showWarning = useCallback(() => {
    toast.warning("Your session will expire in 2 minutes due to inactivity", {
      duration: 10000,
    });
  }, []);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    clearTimers();

    if (!isAuthenticated) return;

    const timeoutDuration = isAdminRef.current ? ADMIN_TIMEOUT_MS : USER_TIMEOUT_MS;
    const warningTime = timeoutDuration - WARNING_BEFORE_MS;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      showWarning();
    }, warningTime);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutDuration);

    console.log(`[ActivityTimeout] Timer reset. Timeout: ${timeoutDuration / 60000} minutes (${isAdminRef.current ? 'admin' : 'user'})`);
  }, [isAuthenticated, clearTimers, handleLogout, showWarning]);

  // Throttled activity handler
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only reset if at least 1 second has passed since last activity
    if (now - lastActivityRef.current > 1000) {
      resetTimers();
    }
  }, [resetTimers]);

  // Check user role and set up activity listeners
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      clearTimers();
      return;
    }

    // Check if user is admin
    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("[ActivityTimeout] Error checking role:", error);
          isAdminRef.current = false;
        } else {
          isAdminRef.current = !!data;
        }

        console.log(`[ActivityTimeout] User role: ${isAdminRef.current ? 'admin' : 'user'}`);
        resetTimers();
      } catch (error) {
        console.error("[ActivityTimeout] Error checking role:", error);
        isAdminRef.current = false;
        resetTimers();
      }
    };

    checkRole();

    // Activity events to track
    const events = [
      "mousemove",
      "mousedown",
      "click",
      "keydown",
      "keypress",
      "scroll",
      "touchstart",
      "touchmove",
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, userId, handleActivity, resetTimers, clearTimers]);

  return { resetTimers };
};
