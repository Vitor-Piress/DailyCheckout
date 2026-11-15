import { m } from "motion/react";
import type { ReactNode } from "react";
import { useMotionPreference } from "../../ui/motion";

const pillTransition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.85,
} as const;

const iconTransition = {
  type: "spring",
  stiffness: 460,
  damping: 28,
} as const;

export function NavActivePill({ layoutId }: { layoutId: string }) {
  const { animationsEnabled } = useMotionPreference();
  const transition = animationsEnabled ? pillTransition : { duration: 0 };

  return (
    <>
      <m.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl bg-[#e8f2ea] ring-1 ring-[#cce0d0]/80"
        layoutId={`${layoutId}-bg`}
        transition={transition}
      />
      <m.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3.5 bottom-0.5 h-[2.5px] rounded-full bg-[#2f6840]"
        layoutId={`${layoutId}-accent`}
        transition={transition}
      />
    </>
  );
}

export function NavAnimatedIcon({
  isActive,
  children,
}: {
  isActive: boolean;
  children: ReactNode;
}) {
  const { animationsEnabled } = useMotionPreference();

  return (
    <m.span
      animate={{ scale: isActive ? 1.07 : 1, y: isActive ? -0.5 : 0 }}
      className="inline-flex shrink-0"
      transition={animationsEnabled ? iconTransition : { duration: 0 }}
    >
      {children}
    </m.span>
  );
}
