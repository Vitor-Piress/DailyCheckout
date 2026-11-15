import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./auth/AuthGuard";
import { RoleGuard } from "./auth/RoleGuard";
import { ForgotPassword } from "./auth/ForgotPassword";
import { Login } from "./auth/Login";
import { ResetPassword } from "./auth/ResetPassword";
import { AppShell } from "./components/layout/AppShell";
import { DailyOperation } from "./features/operation/DailyOperation";
import { ClientsAndPacks } from "./features/clients/ClientsAndPacks";
import { DailyManagement } from "./features/management/DailyManagement";
import { Management } from "./features/management/Management";
import { ExpenseManagement } from "./features/management/ExpenseManagement";
import { PeriodicManagement } from "./features/management/PeriodicManagement";

export default function App() {
  return (
    <Routes>
      <Route element={<Login />} path="/login" />
      <Route element={<ForgotPassword />} path="/auth/forgot-password" />
      <Route element={<ResetPassword />} path="/auth/reset-password" />
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route element={<DailyOperation />} path="/" />
          <Route element={<ClientsAndPacks />} path="/clientes" />
          <Route element={<Management />} path="/gestao">
            <Route element={<Navigate replace to="diario" />} index />
            <Route element={<DailyManagement />} path="diario" />
            <Route
              element={
                <RoleGuard allowedRole="admin" redirectTo="/gestao/diario" />
              }
            >
              <Route element={<ExpenseManagement />} path="despesas" />
              <Route element={<PeriodicManagement />} path="relatorios" />
            </Route>
            <Route element={<Navigate replace to="diario" />} path="*" />
          </Route>
          <Route element={<RoleGuard allowedRole="admin" />}>
            <Route
              element={<Navigate replace to="/gestao/despesas" />}
              path="/despesas"
            />
            <Route
              element={<Navigate replace to="/gestao/relatorios" />}
              path="/relatorios/periodicos"
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
