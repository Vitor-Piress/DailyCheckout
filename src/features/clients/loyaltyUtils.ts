import type { Client, ClientLoyaltySummary } from "../../api/types";

export const MIN_LOYALTY_TIP_CENTS = 1;
export const MAX_LOYALTY_TIP_CENTS = 50_000;

export const DEFAULT_LOYALTY_SUMMARY: ClientLoyaltySummary = {
  currentCuts: 0,
  targetCuts: 10,
  remainingCuts: 10,
  freeCutAvailable: false,
  totalRewardsRedeemed: 0,
};

/**
 * Normalizes a client's loyalty summary with safe defaults when unavailable.
 */
export function getClientLoyalty(
  client?: Pick<Client, "loyalty"> | { loyalty?: ClientLoyaltySummary | null } | null,
): ClientLoyaltySummary {
  return client?.loyalty ?? DEFAULT_LOYALTY_SUMMARY;
}

/**
 * Computes percentage completion for loyalty progress indicators (clamped 0-100).
 */
export function getLoyaltyProgressPercent(
  loyalty: ClientLoyaltySummary,
): number {
  if (loyalty.targetCuts <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((loyalty.currentCuts / loyalty.targetCuts) * 100)),
  );
}

/**
 * Validates optional tip amounts for quick-redeem loyalty flows.
 */
export function getOptionalTipError(
  includeTip: boolean,
  tipCents: number,
): string | null {
  if (!includeTip) return null;
  if (tipCents < MIN_LOYALTY_TIP_CENTS) {
    return "Informe um valor de gorjeta de pelo menos R$ 0,01.";
  }
  if (tipCents > MAX_LOYALTY_TIP_CENTS) {
    return "O valor máximo permitido para gorjeta é R$ 500,00.";
  }
  return null;
}

/**
 * Formats the remaining cuts label with proper Portuguese singular/plural wording.
 */
export function formatLoyaltyRemainingLabel(
  loyalty: ClientLoyaltySummary,
): string {
  if (loyalty.freeCutAvailable) {
    return "Prêmio disponível para resgate!";
  }
  if (loyalty.remainingCuts === 1) {
    return "Falta 1 corte";
  }
  return `Faltam ${loyalty.remainingCuts} cortes`;
}

/**
 * Checks whether a standalone service name counts toward the 10-cut loyalty rule.
 */
export function isLoyaltyEligibleServiceName(serviceName: string): boolean {
  const normalized = serviceName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "corte masculino" || normalized === "cabelo e barba";
}
