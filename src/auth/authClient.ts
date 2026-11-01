import { createInternalNeonAuth } from "@neon/auth";
import { BetterAuthReactAdapter } from "@neon/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim();

const auth = createInternalNeonAuth(authUrl ?? "", {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = auth.adapter;

export const getAuthToken = () => auth.getJWTToken();

export type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>["data"];
export type AuthUser = NonNullable<AuthSession>["user"];
