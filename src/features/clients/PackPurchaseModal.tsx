import { Check, PackagePlus, Scissors, ShieldCheck, X } from "lucide-react";
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
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="motion-content max-h-[94vh] w-full max-w-[34rem] overflow-y-auto rounded-t-2xl border border-[#dce5dd] bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
              <PackagePlus size={20} />
            </div>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                Venda / Renovação em 1 passo
              </p>
              <h2 className="m-0 text-lg font-bold text-[#17211b]">
                Pacote Mensal · {client.name}
              </h2>
              <small className="text-xs text-[#617067]">
                {formatPhone(client.phone)} · Exclusivo para Corte Masculino
              </small>
            </div>
          </div>
          <IconButton
            aria-label="Fechar"
            icon={<X size={18} />}
            onClick={onClose}
            type="button"
          />
        </div>

        {loadingPlans ? (
          <LoadingMessage>Carregando planos de pacotes...</LoadingMessage>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <fieldset className="grid gap-2.5 border-0 p-0">
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
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-[#2f6840] bg-[#2f6840] text-white"
                              : "border-[#9fb3a4] bg-white"
                          }`}
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                        <div className="grid gap-0.5">
                          <strong className="text-base text-[#17211b]">
                            {plan.name}
                          </strong>
                          <span className="text-xs font-bold text-[#2f6840]">
                            {formatCurrency(plan.unitCutPriceCents)} por corte (
                            {plan.totalCuts} cortes)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
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
              <div className="grid gap-3 rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#2f6840]">
                  <ShieldCheck size={16} />
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

            <PaymentMethodSelector
              legend="Forma de pagamento do pacote"
              name="pack-payment-method"
              onChange={(method) => {
                setPaymentMethod(method);
                if (error) setError(null);
              }}
              value={paymentMethod}
            />

            <div className="grid gap-3 rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] p-3.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 select-none">
                <div className="grid gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[#17211b]">
                    <Scissors className="text-[#2f6840]" size={16} />
                    Registrar 1º corte agora
                  </span>
                  <span className="text-xs text-[#617067]">
                    Debita o 1º atendimento para o usuário atual nesta mesma transação.
                  </span>
                </div>
                <input
                  checked={redeemFirstCut}
                  className="h-5 w-5 rounded border-[#c8d6ca] text-[#2f6840] focus:ring-[#2f6840]"
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

              {redeemFirstCut && (
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
                      Máximo de R$ 500,00 · Repassado integralmente a quem realizou o corte.
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
              )}
            </div>

            <label className="grid gap-1 text-sm font-bold text-[#34443a]">
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

            {error && (
              <FeedbackMessage
                message={error}
                onClose={() => setError(null)}
                variant="error"
              />
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                disabled={submitting}
                onClick={onClose}
                type="button"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                disabled={submitting || !selectedPlanId || !paymentMethod}
                type="submit"
              >
                {submitting
                  ? redeemFirstCut
                    ? "Ativando e debitando 1º corte..."
                    : "Ativando..."
                  : selectedPlan
                    ? redeemFirstCut
                      ? `Confirmar pacote + 1º corte (${formatCurrency(selectedPlan.priceCents)})`
                      : `Confirmar ${formatCurrency(selectedPlan.priceCents)}`
                    : "Confirmar pacote"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
