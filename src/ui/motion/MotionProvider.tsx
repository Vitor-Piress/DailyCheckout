import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MotionContext,
  type MotionPreference,
} from "./motionContext";

const storageKey = "dailycheckout.motion-preference";

function getInitialPreference(): MotionPreference {
  if (typeof window === "undefined") return "enabled";

  const storedPreference = window.localStorage.getItem(storageKey);
  if (storedPreference === "enabled" || storedPreference === "disabled") {
    return storedPreference;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "disabled"
    : "enabled";
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] =
    useState<MotionPreference>(getInitialPreference);
  const animationsEnabled = preference === "enabled";

  useEffect(() => {
    document.documentElement.dataset.motion = preference;
    window.localStorage.setItem(storageKey, preference);
  }, [preference]);

  const value = useMemo(
    () => ({
      animationsEnabled,
      toggleAnimations: () =>
        setPreference((current) =>
          current === "enabled" ? "disabled" : "enabled",
        ),
      setAnimationsEnabled: (enabled: boolean) =>
        setPreference(enabled ? "enabled" : "disabled"),
    }),
    [animationsEnabled],
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}
