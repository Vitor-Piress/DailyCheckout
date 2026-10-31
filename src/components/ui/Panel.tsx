import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#dce5dd] bg-white p-5 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)] ${className}`}
    >
      {children}
    </div>
  );
}
