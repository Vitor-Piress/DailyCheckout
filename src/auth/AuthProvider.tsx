import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "./authClient";
import { AuthContext } from "./authContext";
import type { AuthUser } from "./authClient";
import { getCurrentUserProfile } from "../api/dailyCheckoutApi";
import type { UserRole } from "./roles";
import type { UserProfile } from "../api/types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setRoleLoading(true);
    try {
      const profile = await getCurrentUserProfile();
      setProfile(profile);
      setRole(profile.role);
    } finally {
      setRoleLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await authClient.getSession();
    if (error) {
      setUser(null);
      throw error;
    }
    const nextUser = data?.user ?? null;
    setUser(nextUser);
    if (!nextUser) {
      setProfile(null);
      setRole(null);
      setRoleLoading(false);
      return;
    }
    setProfile(null);
    setRole(null);
    await refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    let active = true;

    void authClient
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          setUser(null);
          throw error;
        }
        const nextUser = data?.user ?? null;
        setUser(nextUser);
        if (!nextUser) {
          setProfile(null);
          setRole(null);
          return;
        }
        setRole(null);
        const profile = await getCurrentUserProfile();
        if (active) {
          setProfile(profile);
          setRole(profile.role);
        }
      })
      .catch((cause: unknown) => {
        console.error("Não foi possível restaurar a sessão:", cause);
        if (active) {
          setRole(null);
          setSessionMessage(
            "Não foi possível carregar seu perfil de acesso. Tente novamente.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRoleLoading(false);
        }
      });

    function handleSessionExpired() {
      setUser(null);
      setProfile(null);
      setRole(null);
      setRoleLoading(false);
      setSessionMessage("Sua sessão expirou. Faça login novamente.");
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      active = false;
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role,
      profile,
      roleLoading,
      loading,
      sessionMessage,
      clearSessionMessage: () => setSessionMessage(null),
      refreshProfile,
      refreshSession,
      signOut,
    }),
    [
      loading,
      profile,
      refreshProfile,
      refreshSession,
      role,
      roleLoading,
      sessionMessage,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
