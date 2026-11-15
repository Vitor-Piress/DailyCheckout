import { Scissors, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { createServiceRecord, getClient } from "../../api/dailyCheckoutApi";
import type { Client, PaymentMethod, ServiceRecord } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { getApiErrorMessage } from "../../lib/errors";
import { formatCurrency } from "../../lib/formatters";
import { PaymentMethodSelector } from "../operation/PaymentMethodSelector";

const MIN_TIP_CENTS = 1;
const MAX_TIP_CENTS = 50_000;

export function PackRedeemModal({
  client,
  onClose,
  onRedeemed,
}: {
  client: Client;
  onClose: () => void;
  onRedeemed: (record: ServiceRecord, updatedClient: Client) => void;
}) {
  const activePack = client.activePack;
  const [includeTip, setIncludeTip] = useState(false);
  const [tipCents, setTipCents] = useState(0);
  const [tipPaymentMethod, setTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tipInputRef = useRef<HTMLInputElement | null>(null);

  if (!activePack) return null;

  function handleToggleTip(checked: boolean) {
    setIncludeTip(checked);
    if (!checked) {
      setTipCents(0);
      return;
    }
    window.requestAnimationFrame(() => {
      tipInputRef.current?.focus();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activePack || submitting) return;

    if (includeTip) {
      if (tipCents < MIN_TIP_CENTS) {
        setError("Informe um valor de gorjeta de pelo menos R$ 0,01.");
        return;
      }
      if (tipCents > MAX_TIP_CENTS) {
        setError("O valor máximo permitido para gorjeta é R$ 500,00.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const record = await createServiceRecord({
        clientId: client.id,
        useActivePack: true,
        ...(includeTip && tipCents > 0
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
          activePack: record.packSummary
            ? {
                ...activePack,
                ...record.packSummary,
              }
            : {
                ...activePack,
                usedCuts: activePack.usedCuts + 1,
                remainingCuts: Math.max(0, activePack.remainingCuts - 1),
                status:
                  activePack.remainingCuts - 1 <= 0 ? "exhausted" : "active",
                needsRenewal: activePack.remainingCuts - 1 <= 0,
              },
        };
      }

      onRedeemed(record, refreshedClient);
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(
          cause,
          "Não foi possível descontar o corte do pacote.",
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <Scissors size={20} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-[#4a7957] uppercase">
              Descontar corte do pacote
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
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="min-w-0 truncate text-sm text-[#17211b]">
                {activePack.planName}
              </strong>
              <span className="shrink-0 rounded-full bg-[#2f6840] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
                Restam {activePack.remainingCuts} de {activePack.totalCuts}
              </span>
            </div>
            <p className="m-0 mt-1 text-xs text-[#34443a]">
              Será registrado 1 <strong>Corte Masculino</strong> e descontado
              automaticamente do saldo deste pacote.
            </p>
          </div>

          <label
            className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-sm font-bold text-[#34443a] transition ${
              includeTip
                ? "border-[#4a7957] bg-[#e8f2ea]"
                : "border-[#dce5dd] bg-white"
            }`}
          >
            <input
              checked={includeTip}
              className="h-4 w-4 accent-[#2f6840]"
              onChange={(event) => handleToggleTip(event.target.checked)}
              type="checkbox"
            />
            <span>Incluir gorjeta neste corte</span>
          </label>

          <AnimatePresence initial={false}>
            {includeTip && (
              <m.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                  <label className="grid gap-1 text-sm font-bold text-[#34443a]">
                    Valor da gorjeta
                    <CurrencyInput
                      className="min-h-12 w-full rounded-[0.6rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-lg font-bold tracking-tight text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                      maxDigits={7}
                      onChangeCents={(nextCents) => {
                        setTipCents(nextCents);
                        if (error) setError(null);
                      }}
                      ref={tipInputRef}
                      valueCents={tipCents}
                    />
                    <span className="text-xs font-normal text-[#617067]">
                      Gorjeta 100% destinada ao barbeiro (
                      {formatCurrency(tipCents)}).
                    </span>
                  </label>

                  <div className="rounded-lg bg-white p-3">
                    <PaymentMethodSelector
                      legend="Forma de pagamento da gorjeta"
                      name="pack-redeem-tip-method"
                      onChange={setTipPaymentMethod}
                      value={tipPaymentMethod}
                    />
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          <label className="grid gap-1 text-sm font-bold text-[#34443a]">
            Observações do corte (opcional)
            <input
              className="min-h-11 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3 py-2 text-sm font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
              maxLength={250}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: Degradê navalhado"
              type="text"
              value={notes}
            />
          </label>

          {error && (
            <FeedbackMessage
              message={error}
              onClose={() => setError(null)}
              variant="error"
            />
          )}
        </div>

        <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2.5 border-t border-[#e8eee9] bg-white px-5 pt-3 pb-4">
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
            className="!min-h-11 h-11 text-sm whitespace-nowrap"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Registrando..." : "Registrar Corte"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
