import { createContext, useContext } from "react";
import type { AuthUser } from "./authClient";

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
