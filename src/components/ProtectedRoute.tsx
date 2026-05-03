import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type PharmacyRole } from "@/lib/auth-context";

type Props = {
  children: ReactNode;
  allow?: PharmacyRole[];
};

export const ProtectedRoute = ({ children, allow }: Props) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && profile && !allow.includes(profile.role)) {
    return <Navigate to="/inventory" replace />;
  }

  return <>{children}</>;
};