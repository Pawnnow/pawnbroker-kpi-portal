import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { data: roleData, isLoading } = useUserRole();

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : roleData?.isAdmin ? (
        <>{children}</>
      ) : (
        <Navigate to="/kpi-upload" replace />
      )}
    </ProtectedRoute>
  );
};

export default AdminRoute;
