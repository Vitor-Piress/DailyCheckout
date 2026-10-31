import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] px-3.5 py-2.5 text-xl font-extrabold tracking-tight text-[#245c35]">
      {children}
    </span>
  );
}
