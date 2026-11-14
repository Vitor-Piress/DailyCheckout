import { Scissors, X } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { createServiceRecord, getClient } from "../../api/dailyCheckoutApi";
import type { Client, PaymentMethod, ServiceRecord } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
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
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="motion-content max-h-[92vh] w-full max-w-[30rem] overflow-y-auto rounded-t-2xl border border-[#dce5dd] bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
              <Scissors size={20} />
            </div>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                Descontar corte do pacote
              </p>
              <h2 className="m-0 text-lg font-bold text-[#17211b]">
                {client.name}
              </h2>
            </div>
          </div>
          <IconButton
            aria-label="Fechar"
            icon={<X size={18} />}
            onClick={onClose}
            type="button"
          />
        </div>

        <form
          className="grid gap-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm text-[#17211b]">
                {activePack.planName}
              </strong>
              <span className="rounded-full bg-[#2f6840] px-2.5 py-0.5 text-xs font-bold text-white">
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

          {includeTip && (
            <div className="motion-content grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
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
                  Gorjeta 100% destinada ao barbeiro ({formatCurrency(tipCents)}
                  ).
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
          )}

          <label className="grid gap-1 text-sm font-bold text-[#34443a]">
            Observações do corte (opcional)
            <input
              className="min-h-11 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3 py-2 text-sm text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]"
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

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              disabled={submitting}
              onClick={onClose}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "Registrando..." : "Registrar Corte do Pacote"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
