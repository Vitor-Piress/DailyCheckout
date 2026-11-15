import { AnimatePresence, m } from "motion/react";
import type { RefObject } from "react";
import type { PaymentMethod } from "../../api/types";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { formatCurrency } from "../../lib/formatters";
import { PaymentMethodSelector } from "../operation/PaymentMethodSelector";
import { MAX_LOYALTY_TIP_CENTS, MIN_LOYALTY_TIP_CENTS } from "./loyaltyUtils";

/**
 * Reusable optional tip + notes inputs shared across loyalty free-cut redeem flows.
 */
export function LoyaltyRedeemFields({
  radioGroupName,
  includeTip,
  onToggleIncludeTip,
  tipCents,
  onChangeTipCents,
  tipTouched = false,
  tipPaymentMethod,
  onChangeTipPaymentMethod,
  notes,
  onChangeNotes,
  tipInputRef,
  disabled = false,
  notesPlaceholder = "Ex.: Resgate fidelidade (10 cortes)",
  compact = false,
}: {
  radioGroupName: string;
  includeTip: boolean;
  onToggleIncludeTip: (checked: boolean) => void;
  tipCents: number;
  onChangeTipCents: (cents: number) => void;
  tipTouched?: boolean;
  tipPaymentMethod: PaymentMethod;
  onChangeTipPaymentMethod: (method: PaymentMethod) => void;
  notes: string;
  onChangeNotes: (value: string) => void;
  tipInputRef?: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  notesPlaceholder?: string;
  compact?: boolean;
}) {
  const tipExceedsMax = includeTip && tipCents > MAX_LOYALTY_TIP_CENTS;
  const tipBelowMin = includeTip && tipCents < MIN_LOYALTY_TIP_CENTS;

  return (
    <div className={compact ? "flex min-w-0 flex-col gap-2.5" : "flex min-w-0 flex-col gap-3"}>
      <label
        className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-sm font-bold text-[#34443a] transition ${
          includeTip
            ? "border-[#4a7957] bg-[#e8f2ea]"
            : "border-[#dce5dd] bg-white hover:border-[#c8d6ca]"
        }`}
      >
        <input
          checked={includeTip}
          className="h-4 w-4 accent-[#2f6840]"
          disabled={disabled}
          onChange={(event) => onToggleIncludeTip(event.target.checked)}
          type="checkbox"
        />
        <span>Incluir gorjeta neste corte gratuito</span>
      </label>

      <AnimatePresence initial={false}>
        {includeTip && (
          <m.div
            animate={{ height: "auto", opacity: 1 }}
            className="shrink-0 overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
              <label className="grid gap-1 text-sm font-bold text-[#34443a]">
                Valor da gorjeta
                <CurrencyInput
                  aria-invalid={tipExceedsMax || (tipTouched && tipBelowMin)}
                  className="min-h-12 w-full rounded-[0.6rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-lg font-bold tracking-tight text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                  disabled={disabled}
                  maxDigits={7}
                  onChangeCents={onChangeTipCents}
                  ref={tipInputRef}
                  valueCents={tipCents}
                />
                {tipExceedsMax ? (
                  <span className="text-xs font-medium text-[#a83e3e]">
                    O valor máximo permitido para gorjeta é R$ 500,00.
                  </span>
                ) : tipTouched && tipBelowMin ? (
                  <span className="text-xs font-medium text-[#a83e3e]">
                    Informe pelo menos R$ 0,01 de gorjeta.
                  </span>
                ) : (
                  <span className="text-xs font-normal text-[#617067]">
                    Gorjeta 100% destinada ao barbeiro (
                    {formatCurrency(tipCents)}).
                  </span>
                )}
              </label>

              <div className="rounded-lg bg-white p-3">
                <PaymentMethodSelector
                  legend="Forma de pagamento da gorjeta"
                  name={radioGroupName}
                  onChange={onChangeTipPaymentMethod}
                  value={tipPaymentMethod}
                />
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <label className="grid shrink-0 gap-1 text-xs font-bold text-[#34443a] sm:text-sm">
        Observações do resgate (opcional)
        <input
          className="min-h-11 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3 py-2 text-sm font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
          disabled={disabled}
          maxLength={250}
          onChange={(event) => onChangeNotes(event.target.value)}
          placeholder={notesPlaceholder}
          type="text"
          value={notes}
        />
      </label>
    </div>
  );
}
