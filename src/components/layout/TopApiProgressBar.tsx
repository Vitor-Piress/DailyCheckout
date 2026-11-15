import { useSyncExternalStore } from "react";
import {
  getApiProgressSnapshot,
  subscribeApiProgress,
} from "../../api/apiProgress";
import { useSimulatedProgress } from "../../lib/useSimulatedProgress";
import { ProgressBar } from "../ui/ProgressBar";

/**
 * Displays a slim global top progress bar whenever API requests exceed 300ms.
 */
export function TopApiProgressBar() {
  const snapshot = useSyncExternalStore(
    subscribeApiProgress,
    getApiProgressSnapshot,
    getApiProgressSnapshot,
  );
  const isActive = snapshot.activeCount > 0;
  const { percent, elapsedMs } = useSimulatedProgress(isActive, {
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
        tone="brand"
      />
    </div>
  );
}
