import { createContext, useContext } from "react";
import type { AuthUser } from "./authClient";
import type { UserRole } from "./roles";
import type { UserProfile } from "../api/types";

export type AuthContextValue = {
  user: AuthUser | null;
  role: UserRole | null;
  profile: UserProfile | null;
  roleLoading: boolean;
  loading: boolean;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  refreshProfile: () => Promise<void>;
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
