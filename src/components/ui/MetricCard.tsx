import type { ReactNode } from "react";

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 overflow-hidden rounded-[0.9rem] bg-[#2f6840] p-4 text-white">
      <span className="text-xs font-bold text-[#d7eadb]">{label}</span>
      <strong className="min-w-0 break-words text-xl sm:text-2xl">{value}</strong>
    </div>
  );
}
