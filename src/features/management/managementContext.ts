import { useOutletContext } from "react-router-dom";

export type ManagementOutletContext = {
  refreshToken: number;
};

export function useManagementRefreshToken(): number {
  const context = useOutletContext<ManagementOutletContext | null>();
  return context?.refreshToken ?? 0;
}
