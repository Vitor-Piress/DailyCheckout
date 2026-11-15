import { Navigate, Outlet, useLocation } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "./authContext";
import type { UserRole } from "./roles";

export function RoleGuard({
  allowedRole,
  redirectTo = "/",
}: {
  allowedRole: UserRole;
  redirectTo?: string;
}) {
  const { loading, role, roleLoading, user } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return <EmptyState>Carregando seu perfil de acesso...</EmptyState>;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (role !== allowedRole) {
    return <Navigate replace to={redirectTo} />;
  }

  return <Outlet />;
}
