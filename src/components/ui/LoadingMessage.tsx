import { Loader2 } from "lucide-react";
import { useSimulatedProgress } from "../../lib/useSimulatedProgress";
import { useMotionPreference } from "../../ui/motion";
import { ProgressBar } from "./ProgressBar";

export type LoadingMessageVariant =
  | "default"
  | "cards"
  | "list"
  | "metrics"
  | "compact";

function LoadingSkeletons({ variant }: { variant: LoadingMessageVariant }) {
  if (variant === "default") {
    return null;
  }

  if (variant === "compact") {
    return (
      <div aria-hidden="true" className="grid min-w-0 gap-2 pt-1">
        {[0, 1].map((item) => (
          <div
            className="grid animate-pulse gap-1.5 rounded-xl border border-[#dce5dd] bg-white p-2.5"
            key={item}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-32 rounded bg-[#e3ece5]" />
              <div className="h-4 w-16 rounded-full bg-[#e8f2ea]" />
            </div>
            <div className="h-2.5 w-24 rounded bg-[#eef3ef]" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "metrics") {
    return (
      <div aria-hidden="true" className="grid min-w-0 gap-3.5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              className="grid animate-pulse gap-2.5 rounded-2xl border border-[#dce5dd] bg-white p-4 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/4%)]"
              key={item}
            >
              <div className="h-3 w-28 rounded bg-[#e3ece5]" />
              <div className="h-7 w-36 rounded bg-[#dce5dd]" />
              <div className="h-2.5 w-40 rounded bg-[#eef3ef]" />
            </div>
          ))}
        </div>
        <div className="grid animate-pulse gap-3 rounded-2xl border border-[#dce5dd] bg-white p-4 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/4%)]">
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 w-40 rounded bg-[#dce5dd]" />
            <div className="h-5 w-24 rounded-full bg-[#e8f2ea]" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((slot) => (
              <div
                className="grid gap-2 rounded-xl border border-[#e8eee9] bg-[#f5f7f4] p-3"
                key={slot}
              >
                <div className="h-2.5 w-24 rounded bg-[#dce5dd]" />
                <div className="h-5 w-20 rounded bg-[#e3ece5]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div aria-hidden="true" className="grid min-w-0 gap-2.5">
        {[0, 1, 2].map((item) => (
          <div
            className="grid animate-pulse gap-2 rounded-xl border border-[#dce5dd] bg-white p-3.5"
            key={item}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-40 rounded bg-[#dce5dd]" />
              <div className="h-4 w-20 rounded bg-[#e8f2ea]" />
            </div>
            <div className="h-3 w-52 max-w-full rounded bg-[#eef3ef]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="grid min-w-0 gap-3">
      {[0, 1, 2].map((item) => (
        <div
          className="grid animate-pulse gap-2.5 rounded-2xl border border-[#dce5dd] bg-white p-4 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/4%)]"
          key={item}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1.5">
              <div className="h-4 w-44 rounded bg-[#dce5dd]" />
              <div className="h-5 w-24 rounded-full bg-[#e8f2ea]" />
            </div>
            <div className="h-7 w-16 rounded-md bg-[#eef3ef]" />
          </div>
          <div className="h-3 w-48 max-w-full rounded bg-[#eef3ef]" />
          <div className="grid grid-cols-10 gap-1 pt-1">
            {Array.from({ length: 10 }, (_, idx) => (
              <div
                className="h-6 rounded-md bg-[#f0f5f1]"
                key={idx}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Displays a real-time progress bar, percentage badge, adaptive API stage text,
 * and optional structural skeletons while awaiting server responses.
 */
export function LoadingMessage({
  children,
  variant = "default",
  completedSteps,
  totalSteps,
  resetKey,
  className = "",
}: {
  children: string;
  variant?: LoadingMessageVariant;
  completedSteps?: number;
  totalSteps?: number;
  resetKey?: string | number;
  className?: string;
}) {
  const { animationsEnabled } = useMotionPreference();
  const { percent, stageLabel, isSlow } = useSimulatedProgress(true, {
    completedSteps,
    totalSteps,
    resetKey,
  });

  const isCompact = variant === "compact";

  return (
    <div
      aria-live="polite"
      className={`no-print grid min-w-0 gap-3 ${className}`}
      role="status"
    >
      <div
        className={`grid min-w-0 gap-2.5 rounded-2xl border ${
          isSlow
            ? "border-[#ead9a6] bg-[#fffdf5]"
            : "border-[#dce5dd] bg-white"
        } ${
          isCompact
            ? "p-3"
            : "p-4 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]"
        }`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#17211b]">
            <Loader2
              aria-hidden="true"
              className={`shrink-0 ${
                isSlow ? "text-[#b88318]" : "text-[#2f6840]"
              } ${animationsEnabled ? "animate-spin" : ""}`}
              size={isCompact ? 16 : 18}
            />
            <span className="truncate">{children}</span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${
              isSlow
                ? "bg-[#fff4d6] text-[#805d12] ring-1 ring-[#ead9a6]"
                : "bg-[#e8f2ea] text-[#2f6840] ring-1 ring-[#c8decb]"
            }`}
          >
            {percent}%
          </span>
        </div>

        <ProgressBar
          ariaLabel={children}
          percent={percent}
          size={isCompact ? "sm" : "md"}
          tone={isSlow ? "amber" : "brand"}
        />

        <p
          className={`m-0 text-xs font-medium ${
            isSlow ? "text-[#805d12]" : "text-[#617067]"
          }`}
        >
          {stageLabel}
        </p>
      </div>

      <LoadingSkeletons variant={variant} />
    </div>
  );
}
