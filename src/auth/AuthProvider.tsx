import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authClient } from "./authClient";
import { AuthContext } from "./authContext";
import type { AuthUser } from "./authClient";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  async function refreshSession() {
    const { data, error } = await authClient.getSession();
    if (error) {
      setUser(null);
      throw error;
    }
    setUser(data?.user ?? null);
  }

  useEffect(() => {
    let active = true;

    void authClient
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setUser(null);
          throw error;
        }
        setUser(data?.user ?? null);
      })
      .then(() => {
        if (!active) return;
      })
      .catch((cause: unknown) => {
        console.error("Não foi possível restaurar a sessão:", cause);
        if (active) {
          setSessionMessage("Não foi possível restaurar sua sessão. Faça login novamente.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    function handleSessionExpired() {
      setUser(null);
      setSessionMessage("Sua sessão expirou. Faça login novamente.");
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      active = false;
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  async function signOut() {
    await authClient.signOut();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      sessionMessage,
      clearSessionMessage: () => setSessionMessage(null),
      refreshSession,
      signOut,
    }),
    [loading, sessionMessage, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
