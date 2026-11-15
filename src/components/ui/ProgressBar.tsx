import { Loader2 } from "lucide-react";
import { useMotionPreference } from "../../ui/motion";
import { useSimulatedProgress } from "../../lib/useSimulatedProgress";

export function ProgressBar({
  percent,
  size = "md",
  tone = "brand",
  showShimmer = true,
  ariaLabel = "Progresso do carregamento",
  className = "",
}: {
  percent: number;
  size?: "sm" | "md";
  tone?: "brand" | "amber";
  showShimmer?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const { animationsEnabled } = useMotionPreference();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  const trackClass =
    size === "sm"
      ? "h-1.5 w-full overflow-hidden rounded-full bg-[#dce5dd]"
      : "h-2.5 w-full overflow-hidden rounded-full bg-[#dce5dd]";

  const fillToneClass =
    tone === "amber"
      ? "from-[#b88318] to-[#d99d2b]"
      : "from-[#2f6840] to-[#4a7957]";

  return (
    <div
      aria-label={ariaLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={`${trackClass} ${className}`}
      role="progressbar"
    >
      <div
        className={`relative h-full overflow-hidden rounded-full bg-gradient-to-r ${fillToneClass} ${
          animationsEnabled ? "transition-[width] duration-200 ease-out" : ""
        }`}
        style={{ width: `${clamped}%` }}
      >
        {animationsEnabled && showShimmer && clamped > 0 && clamped < 100 && (
          <span
            aria-hidden="true"
            className="progress-shimmer-bar absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline progress feedback shown during API mutations (saves, redemptions, pagination).
 */
export function InlineMutationProgress({
  active,
  label,
  className = "",
}: {
  active: boolean;
  label: string;
  className?: string;
}) {
  const { animationsEnabled } = useMotionPreference();
  const { percent, stageLabel, isSlow } = useSimulatedProgress(active);

  if (!active) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`no-print grid min-w-0 gap-2 rounded-xl border ${
        isSlow
          ? "border-[#ead9a6] bg-[#fff9e8]"
          : "border-[#dce5dd] bg-[#f5f7f4]"
      } px-3.5 py-2.5 ${className}`}
      role="status"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#17211b]">
          <Loader2
            aria-hidden="true"
            className={`shrink-0 text-[#2f6840] ${
              animationsEnabled ? "animate-spin" : ""
            }`}
            size={15}
          />
          <span className="truncate">{label}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${
            isSlow
              ? "bg-[#fff4d6] text-[#805d12] ring-1 ring-[#ead9a6]"
              : "bg-[#e8f2ea] text-[#2f6840] ring-1 ring-[#c8decb]"
          }`}
        >
          {percent}%
        </span>
      </div>
      <ProgressBar
        ariaLabel={label}
        percent={percent}
        size="sm"
        tone={isSlow ? "amber" : "brand"}
      />
      <p
        className={`m-0 text-[11px] font-medium ${
          isSlow ? "text-[#805d12]" : "text-[#617067]"
        }`}
      >
        {stageLabel}
      </p>
    </div>
  );
}
