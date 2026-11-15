import { useEffect, useId } from "react";
import { useOutletContext } from "react-router-dom";

export type ManagementOutletContext = {
  refreshToken: number;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
};

export function useManagementRefreshToken(): number {
  const context = useOutletContext<ManagementOutletContext | null>();
  return context?.refreshToken ?? 0;
}

export function useManagementLoadingSync(loading: boolean): void {
  const context = useOutletContext<ManagementOutletContext | null>();
  const setSectionLoading = context?.setSectionLoading;
  const sectionId = useId();

  useEffect(() => {
    if (!setSectionLoading) {
      return;
    }

    setSectionLoading(sectionId, loading);
    return () => {
      setSectionLoading(sectionId, false);
    };
  }, [loading, sectionId, setSectionLoading]);
}
