import { createContext, useContext } from "react";

export type MotionPreference = "enabled" | "disabled";

export type MotionContextValue = {
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
};

export const MotionContext = createContext<MotionContextValue | null>(null);

export function useMotionPreference(): MotionContextValue {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error(
      "useMotionPreference deve ser usado dentro de MotionProvider.",
    );
  }
  return context;
}
