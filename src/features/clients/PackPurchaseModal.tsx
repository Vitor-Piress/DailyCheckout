import { Check, PackagePlus, Scissors, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  createClientPack,
  getClient,
  listPackPlans,
} from "../../api/dailyCheckoutApi";
import type {
  Client,
  ClientPackDetail,
  PackPlan,
  PaymentMethod,
} from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCurrency,
  formatPhone,
  maskCpfInput,
} from "../../lib/formatters";
import { PaymentMethodSelector } from "../operation/PaymentMethodSelector";

const fieldClass =
  "min-h-12 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-base text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";

export function PackPurchaseModal({
  client,
  onClose,
  onPurchased,
}: {
  client: Client;
  onClose: () => void;
  onPurchased: (updatedClient: Client, pack: ClientPackDetail) => void;
}) {
  const [plans, setPlans] = useState<PackPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    "pix",
  );
  const [redeemFirstCut, setRedeemFirstCut] = useState(false);
  const [tipCents, setTipCents] = useState(0);
  const [tipPaymentMethod, setTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [email, setEmail] = useState(client.email ?? "");
  const [cpf, setCpf] = useState(client.cpf ? maskCpfInput(client.cpf) : "");
  const [notes, setNotes] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsProfileCompletion =
    !client.hasPackProfile || !client.email || !client.cpf;

  useEffect(() => {
    void listPackPlans()
      .then((availablePlans) => {
        setPlans(availablePlans);
        const preferred =
          availablePlans.find((plan) => plan.totalCuts === 4) ??
          availablePlans[0];
        if (preferred) {
          setSelectedPlanId(preferred.id);
        }
      })
      .catch((cause: unknown) => {
        setError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar os planos de pacotes mensais.",
          ),
        );
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selectedPlanId || !paymentMethod) return;

    const trimmedEmail = email.trim();
    const cpfDigits = cpf.replace(/\D/g, "");

    if (needsProfileCompletion) {
      if (!trimmedEmail) {
        setError("Informe o e-mail do cliente para ativar o pacote mensal.");
        return;
      }
      if (cpfDigits.length !== 11) {
        setError(
          "Informe um CPF válido com 11 dígitos para ativar o pacote mensal.",
        );
        return;
      }
    }

    if (redeemFirstCut && tipCents > 50000) {
      setError("A gorjeta máxima permitida é R$ 500,00.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const createdPack = await createClientPack({
        clientId: client.id,
        packPlanId: selectedPlanId,
        paymentMethod,
        ...(redeemFirstCut ? { redeemFirstCut: true } : {}),
        ...(redeemFirstCut && tipCents > 0
          ? {
              tipCents: Math.trunc(tipCents),
              tipPaymentMethod,
            }
          : {}),
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(cpfDigits ? { cpf: cpfDigits } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });

      let refreshedClient: Client;
      try {
        refreshedClient = await getClient(client.id);
      } catch {
        refreshedClient = {
          ...client,
          email: trimmedEmail || client.email,
          cpf: cpfDigits || client.cpf,
          hasPackProfile: true,
          activePack: {
            id: createdPack.id,
            packPlanId: createdPack.packPlanId,
            planName:
              createdPack.planName || selectedPlan?.name || "Pacote Mensal",
            totalCuts:
              createdPack.totalCuts ?? selectedPlan?.totalCuts ?? 0,
            usedCuts:
              createdPack.usedCuts ?? (redeemFirstCut ? 1 : 0),
            remainingCuts:
              createdPack.remainingCuts ??
              Math.max(
                0,
                (selectedPlan?.totalCuts ?? 0) - (redeemFirstCut ? 1 : 0),
              ),
            status: createdPack.status ?? "active",
            needsRenewal: false,
            purchasedAt: createdPack.purchasedAt ?? new Date().toISOString(),
          },
        };
      }

      onPurchased(refreshedClient, createdPack);
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(cause, "Não foi possível registrar a venda do pacote."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay
      disabled={submitting}
      maxWidthClass="max-w-[34rem]"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-5 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <PackagePlus size={20} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-[#4a7957] uppercase">
              Venda / Renovação em 1 passo
            </p>
            <h2 className="m-0 truncate text-lg font-bold text-[#17211b]">
              Pacote Mensal · {client.name}
            </h2>
            <small className="text-xs text-[#617067]">
              {formatPhone(client.phone)} · Exclusivo para Corte Masculino
            </small>
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

      {loadingPlans ? (
        <div className="flex min-h-[26rem] items-center justify-center px-4 py-4 sm:px-5">
          <LoadingMessage className="w-full" variant="cards">
            Carregando planos de pacotes...
          </LoadingMessage>
        </div>
      ) : (
        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <fieldset className="grid shrink-0 gap-2.5 border-0 p-0">
              <legend className="mb-1.5 text-sm font-bold text-[#34443a]">
                Escolha o plano (Corte Masculino)
              </legend>
              <div className="grid gap-2.5">
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  return (
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-3.5 transition active:scale-[0.99] ${
                        selected
                          ? "border-[#2f6840] bg-[#e8f2ea]"
                          : "border-[#dce5dd] bg-white hover:border-[#4a7957]"
                      }`}
                      key={plan.id}
                    >
                      <input
                        checked={selected}
                        className="sr-only"
                        name="pack-plan"
                        onChange={() => {
                          setSelectedPlanId(plan.id);
                          if (error) setError(null);
                        }}
                        type="radio"
                        value={plan.id}
                      />
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#2f6840] bg-[#2f6840] text-white"
                              : "border-[#9fb3a4] bg-white"
                          }`}
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                        <div className="grid min-w-0 gap-0.5">
                          <strong className="text-base text-[#17211b]">
                            {plan.name}
                          </strong>
                          <span className="text-xs font-bold text-[#2f6840]">
                            {formatCurrency(plan.unitCutPriceCents)} por corte (
                            {plan.totalCuts} cortes)
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <strong className="block text-lg font-extrabold text-[#2f6840]">
                          {formatCurrency(plan.priceCents)}
                        </strong>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {needsProfileCompletion && (
              <div className="grid shrink-0 gap-3 rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#2f6840]">
                  <ShieldCheck className="shrink-0" size={16} />
                  <span>Completar dados do cliente para o pacote</span>
                </div>
                <label className="grid gap-1 text-sm font-bold text-[#34443a]">
                  E-mail do cliente *
                  <input
                    className={fieldClass}
                    inputMode="email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="cliente@email.com"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#34443a]">
                  CPF do cliente *
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    onChange={(event) => {
                      setCpf(maskCpfInput(event.target.value));
                      if (error) setError(null);
                    }}
                    placeholder="000.000.000-00"
                    required
                    type="text"
                    value={cpf}
                  />
                  <span className="text-xs font-normal text-[#617067]">
                    Salvo automaticamente no cadastro do cliente.
                  </span>
                </label>
              </div>
            )}

            <div className="shrink-0">
              <PaymentMethodSelector
                legend="Forma de pagamento do pacote"
                name="pack-payment-method"
                onChange={(method) => {
                  setPaymentMethod(method);
                  if (error) setError(null);
                }}
                value={paymentMethod}
              />
            </div>

            <div className="grid shrink-0 gap-3 rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] p-3.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 select-none">
                <div className="grid min-w-0 gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[#17211b]">
                    <Scissors className="shrink-0 text-[#2f6840]" size={16} />
                    <span>Registrar 1º corte agora</span>
                  </span>
                  <span className="text-xs text-[#617067]">
                    Debita o 1º atendimento para o usuário atual nesta mesma transação.
                  </span>
                </div>
                <input
                  checked={redeemFirstCut}
                  className="h-5 w-5 shrink-0 rounded border-[#c8d6ca] text-[#2f6840] focus:ring-[#2f6840]"
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setRedeemFirstCut(checked);
                    if (!checked) {
                      setTipCents(0);
                    }
                    if (error) setError(null);
                  }}
                  type="checkbox"
                />
              </label>

              <AnimatePresence initial={false}>
                {redeemFirstCut && (
                  <m.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="shrink-0 overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="grid gap-3 border-t border-[#dce5dd] pt-3">
                      <div className="grid gap-1">
                        <label
                          className="text-xs font-bold text-[#34443a]"
                          htmlFor="pack-first-cut-tip"
                        >
                          Gorjeta do 1º corte (opcional)
                        </label>
                        <CurrencyInput
                          className={fieldClass}
                          disabled={submitting}
                          id="pack-first-cut-tip"
                          onChangeCents={(val) => {
                            if (val <= 50000) {
                              setTipCents(val);
                              if (error) setError(null);
                            }
                          }}
                          placeholder="R$ 0,00"
                          valueCents={tipCents}
                        />
                        <span className="text-[11px] text-[#617067]">
                          Máximo de R$ 500,00 · Repassado integralmente a quem
                          realizou o corte.
                        </span>
                      </div>

                      {tipCents > 0 && (
                        <PaymentMethodSelector
                          legend="Forma de pagamento da gorjeta"
                          name="pack-tip-payment-method"
                          onChange={(method) => {
                            if (method) setTipPaymentMethod(method);
                          }}
                          value={tipPaymentMethod}
                        />
                      )}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <label className="grid shrink-0 gap-1 text-sm font-bold text-[#34443a]">
              Observações (opcional)
              <input
                className={fieldClass}
                maxLength={250}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: Renovação mensal"
                type="text"
                value={notes}
              />
            </label>

            <InlineMutationProgress
              active={submitting}
              label="Registrando venda do pacote..."
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
              disabled={submitting || !selectedPlanId || !paymentMethod}
              type="submit"
            >
              {submitting
                ? redeemFirstCut
                  ? "Ativando e debitando..."
                  : "Ativando..."
                : selectedPlan
                  ? redeemFirstCut
                    ? `Ativar + 1º corte (${formatCurrency(selectedPlan.priceCents)})`
                    : `Confirmar ${formatCurrency(selectedPlan.priceCents)}`
                  : "Confirmar pacote"}
            </Button>
          </div>
        </form>
      )}
    </ModalOverlay>
  );
}
