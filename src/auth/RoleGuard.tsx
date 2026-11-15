import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingMessage } from "../components/ui/LoadingMessage";
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
    return (
      <div className="mx-auto w-full max-w-[34rem] py-4">
        <LoadingMessage variant="cards">
          Carregando seu perfil de acesso...
        </LoadingMessage>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (role !== allowedRole) {
    return <Navigate replace to={redirectTo} />;
  }

  return <Outlet />;
}
