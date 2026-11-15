import { Gift, X } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { createServiceRecord, getClient } from "../../api/dailyCheckoutApi";
import type { Client, PaymentMethod, ServiceRecord } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { getApiErrorMessage } from "../../lib/errors";
import { LoyaltyRedeemFields } from "./LoyaltyRedeemFields";
import { getClientLoyalty, getOptionalTipError } from "./loyaltyUtils";

export function LoyaltyRedeemModal({
  client,
  onClose,
  onRedeemed,
}: {
  client: Client;
  onClose: () => void;
  onRedeemed: (record: ServiceRecord, updatedClient: Client) => void;
}) {
  const loyalty = getClientLoyalty(client);
  const [includeTip, setIncludeTip] = useState(false);
  const [tipCents, setTipCents] = useState(0);
  const [tipTouched, setTipTouched] = useState(false);
  const [tipPaymentMethod, setTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tipInputRef = useRef<HTMLInputElement | null>(null);

  if (!loyalty.freeCutAvailable) {
    return null;
  }

  function handleToggleIncludeTip(checked: boolean) {
    setIncludeTip(checked);
    setTipTouched(false);
    setError(null);
    if (!checked) {
      setTipCents(0);
      return;
    }
    window.setTimeout(() => {
      tipInputRef.current?.focus();
    }, 190);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const tipValidationError = getOptionalTipError(includeTip, tipCents);
    if (tipValidationError) {
      setTipTouched(true);
      setError(tipValidationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const record = await createServiceRecord({
        clientId: client.id,
        useLoyaltyReward: true,
        ...(includeTip
          ? {
              tipCents: Math.trunc(tipCents),
              tipPaymentMethod,
            }
          : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });

      let refreshedClient: Client;
      try {
        refreshedClient = await getClient(client.id);
      } catch {
        refreshedClient = {
          ...client,
          loyalty: record.loyaltySummary ?? {
            currentCuts: 0,
            targetCuts: loyalty.targetCuts,
            remainingCuts: loyalty.targetCuts,
            freeCutAvailable: false,
            totalRewardsRedeemed: loyalty.totalRewardsRedeemed + 1,
          },
        };
      }

      onRedeemed(record, refreshedClient);
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(
          cause,
          "Não foi possível resgatar o corte gratuito de fidelidade.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay
      disabled={submitting}
      maxWidthClass="max-w-[30rem]"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-5 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4d6] text-[#805d12]">
            <Gift size={20} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-[#805d12] uppercase">
              Programa de Fidelidade
            </p>
            <h2 className="m-0 truncate text-lg font-bold text-[#17211b]">
              {client.name}
            </h2>
          </div>
        </div>
        <IconButton
          aria-label="Fechar"
          className="shrink-0"
          disabled={submitting}
          icon={<X size={18} />}
          onClick={onClose}
          type="button"
        />
      </div>

      <form
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="shrink-0 rounded-xl border border-[#ead9a6] bg-[#fff9e8] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="min-w-0 truncate text-sm text-[#17211b]">
                Corte Masculino Grátis
              </strong>
              <span className="shrink-0 rounded-full bg-[#805d12] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
                {loyalty.currentCuts}/{loyalty.targetCuts} cortes
              </span>
            </div>
            <p className="m-0 mt-1 text-xs text-[#6e4f0e]">
              Cortesia de fidelidade a <strong>R$ 0,00</strong> para o cliente.
              Após confirmar, o contador volta para{" "}
              <strong>0/{loyalty.targetCuts}</strong>.
            </p>
          </div>

          <div className="shrink-0">
            <LoyaltyRedeemFields
              disabled={submitting}
              includeTip={includeTip}
              notes={notes}
              onChangeNotes={setNotes}
              onChangeTipCents={(cents) => {
                setTipCents(cents);
                setTipTouched(true);
                if (error) setError(null);
              }}
              onChangeTipPaymentMethod={setTipPaymentMethod}
              onToggleIncludeTip={handleToggleIncludeTip}
              radioGroupName="loyalty-modal-tip-method"
              tipCents={tipCents}
              tipInputRef={tipInputRef}
              tipPaymentMethod={tipPaymentMethod}
              tipTouched={tipTouched}
            />
          </div>

          <InlineMutationProgress
            active={submitting}
            label="Resgatando corte fidelidade..."
          />

          {error && (
            <div className="shrink-0">
              <FeedbackMessage
                message={error}
                onClose={() => setError(null)}
                variant="error"
              />
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2.5 border-t border-[#e8eee9] bg-white px-4 pt-3 pb-4 sm:px-5">
          <Button
            className="!min-h-11 h-11 px-4 text-sm whitespace-nowrap"
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Cancelar
          </Button>
          <Button
            className="!min-h-11 h-11 px-3 text-xs whitespace-nowrap sm:text-sm"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Resgatando..." : "Confirmar Resgate Grátis"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
