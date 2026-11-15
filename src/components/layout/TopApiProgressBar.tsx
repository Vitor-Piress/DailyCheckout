import { Loader2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  getApiProgressSnapshot,
  subscribeApiProgress,
} from "../../api/apiProgress";
import { useSimulatedProgress } from "../../lib/useSimulatedProgress";
import { useMotionPreference } from "../../ui/motion";
import { ProgressBar } from "../ui/ProgressBar";

/**
 * Displays a slim global top progress bar and live percentage pill whenever
 * API requests exceed 300ms (especially helpful during free-tier cold starts).
 */
export function TopApiProgressBar() {
  const { animationsEnabled } = useMotionPreference();
  const snapshot = useSyncExternalStore(
    subscribeApiProgress,
    getApiProgressSnapshot,
    getApiProgressSnapshot,
  );
  const isActive = snapshot.activeCount > 0;
  const { percent, isSlow, elapsedMs } = useSimulatedProgress(isActive, {
    completedSteps: snapshot.batchCompleted,
    totalSteps: snapshot.batchTotal,
    startedAtMs: snapshot.batchStartedAt,
  });

  if (!isActive || elapsedMs < 300) {
    return null;
  }

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[60]">
      <ProgressBar
        ariaLabel="Sincronização global com a API"
        percent={percent}
        size="top"
        tone={isSlow ? "amber" : "brand"}
      />
      {elapsedMs >= 1000 && (
        <div
          aria-live="polite"
          className="fixed top-2.5 right-3 z-[60] flex items-center gap-1.5 rounded-full border border-[#dce5dd] bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#17211b] shadow-md backdrop-blur-sm"
          role="status"
        >
          <Loader2
            aria-hidden="true"
            className={`shrink-0 text-[#2f6840] ${
              animationsEnabled ? "animate-spin" : ""
            }`}
            size={13}
          />
          <span>{isSlow ? "Conectando API..." : "Sincronizando..."}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
              isSlow
                ? "bg-[#fff4d6] text-[#805d12]"
                : "bg-[#e8f2ea] text-[#2f6840]"
            }`}
          >
            {percent}%
          </span>
        </div>
      )}
    </div>
  );
}
