import { Gift, Scissors } from "lucide-react";
import type { ClientLoyaltySummary } from "../../api/types";

type LoyaltyStampVariant = "micro" | "compact" | "detailed";

export function LoyaltyStampGrid({
  loyalty,
  variant = "compact",
  showHeader = variant !== "detailed",
  showRedeemedCount = false,
  className = "",
}: {
  loyalty: ClientLoyaltySummary;
  variant?: LoyaltyStampVariant;
  showHeader?: boolean;
  showRedeemedCount?: boolean;
  className?: string;
}) {
  const totalSlots = Math.max(1, Math.trunc(loyalty.targetCuts || 10));
  const filledCount = Math.min(
    totalSlots,
    Math.max(0, Math.trunc(loyalty.currentCuts || 0)),
  );
  const isReady = loyalty.freeCutAvailable || filledCount >= totalSlots;

  const isMicro = variant === "micro";
  const isDetailed = variant === "detailed";

  const squareShapeClass = isMicro
    ? "aspect-square w-full rounded-[0.35rem]"
    : isDetailed
      ? "aspect-square w-full rounded-lg"
      : "aspect-square w-full rounded-md";

  const gridMaxWidthClass = isMicro
    ? "max-w-[15rem]"
    : isDetailed
      ? "max-w-[24rem]"
      : "max-w-[19.5rem]";

  const containerSurfaceClass = isDetailed
    ? ""
    : isMicro
      ? `rounded-lg border px-2.5 py-1.5 ${
          isReady
            ? "border-[#ead9a6] bg-[#fff9e8]"
            : "border-[#e2ebe3] bg-[#f7faf7]"
        }`
      : `rounded-xl border px-3 py-2.5 ${
          isReady
            ? "border-[#ead9a6] bg-[#fff9e8]"
            : "border-[#dce5dd] bg-[#f5f7f4]"
        }`;

  return (
    <div className={`grid min-w-0 gap-1.5 ${containerSurfaceClass} ${className}`}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span
            className={`inline-flex items-center gap-1 font-bold ${
              isMicro ? "text-[11px]" : "text-xs"
            } ${isReady ? "text-[#805d12]" : "text-[#4a7957]"}`}
          >
            <Gift className="shrink-0" size={isMicro ? 11 : 13} />
            <span>
              {isReady
                ? "Fidelidade · Corte Grátis"
                : "Fidelidade"}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            {showRedeemedCount && loyalty.totalRewardsRedeemed > 0 && (
              <span className="text-[11px] font-medium text-[#617067]">
                Resgates: {loyalty.totalRewardsRedeemed}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 font-extrabold tabular-nums ${
                isMicro ? "text-[10px]" : "text-[11px]"
              } ${
                isReady
                  ? "bg-[#805d12] text-white"
                  : "border border-[#dce5dd] bg-white text-[#2f6840]"
              }`}
            >
              {filledCount}/{totalSlots}
            </span>
          </div>
        </div>
      )}

      <div
        aria-label={`Fidelidade: ${filledCount} de ${totalSlots} cortes`}
        className={`grid w-full min-w-0 ${gridMaxWidthClass} grid-cols-10 gap-1 sm:gap-1.5`}
        role="img"
      >
        {Array.from({ length: totalSlots }, (_, index) => {
          const filled = index < filledCount;
          const isMilestoneSlot = index === totalSlots - 1;

          const slotClass = filled
            ? isReady || isMilestoneSlot
              ? "border-[#c18b20] bg-[#c18b20] text-white shadow-[0_1px_2px_rgb(128_93_18/22%)]"
              : "border-[#2f6840] bg-[#2f6840] text-white shadow-[0_1px_2px_rgb(47_104_64/20%)]"
            : isReady
              ? "border-[#ead9a6] bg-white"
              : "border-[#cfdcd1] bg-white";

          return (
            <span
              aria-hidden="true"
              className={`flex min-w-0 items-center justify-center border transition-colors ${squareShapeClass} ${slotClass}`}
              key={index}
            >
              {filled &&
                (isMilestoneSlot ? (
                  <Gift
                    className={
                      isMicro
                        ? "h-2.5 w-2.5"
                        : isDetailed
                          ? "h-3.5 w-3.5"
                          : "h-3 w-3 sm:h-3.5 sm:w-3.5"
                    }
                    strokeWidth={2.4}
                  />
                ) : (
                  <Scissors
                    className={
                      isMicro
                        ? "h-2.5 w-2.5"
                        : isDetailed
                          ? "h-3.5 w-3.5"
                          : "h-3 w-3 sm:h-3.5 sm:w-3.5"
                    }
                    strokeWidth={2.3}
                  />
                ))}
            </span>
          );
        })}
      </div>
    </div>
  );
}
