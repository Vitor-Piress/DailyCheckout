import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingMessage } from "../components/ui/LoadingMessage";
import { useAuth } from "./authContext";

export function AuthGuard() {
  const { loading, roleLoading, user } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="mx-auto grid min-h-dvh w-full max-w-[34rem] content-center gap-3 px-4 py-8 sm:px-6">
        <LoadingMessage variant="cards">
          {loading
            ? "Restaurando sua sessão..."
            : "Carregando permissões da conta..."}
        </LoadingMessage>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
