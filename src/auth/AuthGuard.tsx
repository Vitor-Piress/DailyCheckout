import { Navigate, Outlet, useLocation } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "./authContext";

export function AuthGuard() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <EmptyState>Restaurando sua sessão...</EmptyState>;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
