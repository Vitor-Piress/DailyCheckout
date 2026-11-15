import { useEffect, useState } from "react";

export type SimulatedProgressState = {
  percent: number;
  stageLabel: string;
  isSlow: boolean;
  elapsedMs: number;
};

type UseSimulatedProgressOptions = {
  completedSteps?: number;
  totalSteps?: number;
  startedAtMs?: number | null;
  resetKey?: string | number;
};

function computeTimePercent(elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return 8;
  }
  if (elapsedMs <= 800) {
    const t = elapsedMs / 800;
    const eased = 1 - Math.pow(1 - t, 2);
    return 8 + Math.round(47 * eased);
  }
  if (elapsedMs <= 3500) {
    const t = (elapsedMs - 800) / 2700;
    const eased = 1 - Math.pow(1 - t, 1.6);
    return 55 + Math.round(27 * eased);
  }
  if (elapsedMs <= 8000) {
    const t = (elapsedMs - 3500) / 4500;
    const eased = 1 - Math.pow(1 - t, 1.4);
    return 82 + Math.round(10 * eased);
  }
  const extraSeconds = (elapsedMs - 8000) / 1000;
  return 92 + Math.min(5, Math.floor(5 * (1 - Math.exp(-extraSeconds / 12))));
}

function computeStepFloor(completedSteps?: number, totalSteps?: number): number {
  if (
    typeof totalSteps !== "number" ||
    totalSteps <= 0 ||
    typeof completedSteps !== "number" ||
    completedSteps <= 0
  ) {
    return 0;
  }
  const ratio = Math.min(1, completedSteps / totalSteps);
  return Math.round(8 + ratio * 88);
}

function resolveStageLabel(
  elapsedMs: number,
  completedSteps?: number,
  totalSteps?: number,
): { stageLabel: string; isSlow: boolean } {
  const hasSteps =
    typeof totalSteps === "number" &&
    totalSteps > 1 &&
    typeof completedSteps === "number";

  if (elapsedMs >= 7500) {
    return {
      stageLabel:
        "Despertando o servidor da API (plano gratuito), só mais um instante...",
      isSlow: true,
    };
  }
  if (elapsedMs >= 3500) {
    return {
      stageLabel: hasSteps
        ? `Sincronizando etapas (${completedSteps}/${totalSteps}) com o servidor...`
        : "Sincronizando dados com o servidor...",
      isSlow: true,
    };
  }
  if (elapsedMs >= 1100) {
    return {
      stageLabel: hasSteps
        ? `Recebendo informações (${completedSteps}/${totalSteps})...`
        : "Buscando informações atualizadas...",
      isSlow: false,
    };
  }
  return {
    stageLabel: "Conectando ao servidor...",
    isSlow: false,
  };
}

/**
 * Produces an adaptive, monotonic loading percentage and stage label
 * that combines real completed API steps with a cold-start-aware curve.
 */
export function useSimulatedProgress(
  active: boolean,
  options?: UseSimulatedProgressOptions,
): SimulatedProgressState {
  const completedSteps = options?.completedSteps;
  const totalSteps = options?.totalSteps;
  const externalStartedAt = options?.startedAtMs;
  const resetKey = options?.resetKey;

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      const clearTimer = window.setTimeout(() => {
        setElapsedMs(0);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    const origin =
      typeof externalStartedAt === "number" && externalStartedAt > 0
        ? externalStartedAt
        : Date.now();

    const syncTimer = window.setTimeout(() => {
      setElapsedMs(Math.max(0, Date.now() - origin));
    }, 0);

    const intervalId = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - origin));
    }, 100);

    return () => {
      window.clearTimeout(syncTimer);
      window.clearInterval(intervalId);
    };
  }, [active, externalStartedAt, resetKey]);

  if (!active) {
    return {
      percent: 100,
      stageLabel: "Dados prontos.",
      isSlow: false,
      elapsedMs: 0,
    };
  }

  const timePercent = computeTimePercent(elapsedMs);
  const stepFloor = computeStepFloor(completedSteps, totalSteps);
  const percent = Math.min(97, Math.max(timePercent, stepFloor));
  const { stageLabel, isSlow } = resolveStageLabel(
    elapsedMs,
    completedSteps,
    totalSteps,
  );

  return {
    percent,
    stageLabel,
    isSlow,
    elapsedMs,
  };
}
