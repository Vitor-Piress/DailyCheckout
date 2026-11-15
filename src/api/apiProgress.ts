export type ApiProgressSnapshot = {
  activeCount: number;
  batchTotal: number;
  batchCompleted: number;
  batchStartedAt: number | null;
};

type ApiProgressListener = () => void;

const listeners = new Set<ApiProgressListener>();

let snapshot: ApiProgressSnapshot = {
  activeCount: 0,
  batchTotal: 0,
  batchCompleted: 0,
  batchStartedAt: null,
};

function updateSnapshot(next: ApiProgressSnapshot): void {
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribes a listener to global in-flight API request batch updates.
 */
export function subscribeApiProgress(
  listener: ApiProgressListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns the latest immutable API request progress snapshot.
 */
export function getApiProgressSnapshot(): ApiProgressSnapshot {
  return snapshot;
}

/**
 * Wraps an HTTP operation so global loading indicators reflect active and completed requests.
 */
export async function trackApiRequest<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const isNewBatch = snapshot.activeCount === 0;
  updateSnapshot({
    activeCount: snapshot.activeCount + 1,
    batchTotal: isNewBatch ? 1 : snapshot.batchTotal + 1,
    batchCompleted: isNewBatch ? 0 : snapshot.batchCompleted,
    batchStartedAt: isNewBatch ? Date.now() : snapshot.batchStartedAt,
  });

  try {
    return await operation();
  } finally {
    const nextActive = Math.max(0, snapshot.activeCount - 1);
    if (nextActive === 0) {
      updateSnapshot({
        activeCount: 0,
        batchTotal: 0,
        batchCompleted: 0,
        batchStartedAt: null,
      });
    } else {
      updateSnapshot({
        activeCount: nextActive,
        batchTotal: snapshot.batchTotal,
        batchCompleted: snapshot.batchCompleted + 1,
        batchStartedAt: snapshot.batchStartedAt,
      });
    }
  }
}
