import { AlertCircle, ArrowLeft, CalendarDays, Scissors } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  createServiceRecord,
  getClient,
  listServiceTypes,
} from "../../api/dailyCheckoutApi";
import type {
  Client,
  ClientPackDetail,
  CreateServiceRecordInput,
  PaymentMethod,
  ServiceType,
} from "../../api/types";
import { useAuth } from "../../auth/authContext";
import { IconButton } from "../../components/ui/IconButton";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { Panel } from "../../components/ui/Panel";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCurrency,
  getCurrentSaoPauloDateTime,
  paymentMethodLabel,
} from "../../lib/formatters";
import { ClientDetailsModal } from "../clients/ClientDetailsModal";
import { ClientRegistrationModal } from "../clients/ClientRegistrationModal";
import { PackPurchaseModal } from "../clients/PackPurchaseModal";
import {
  getClientLoyalty,
  isLoyaltyEligibleServiceName,
} from "../clients/loyaltyUtils";
import { ClientQuickPicker } from "./ClientQuickPicker";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { ServiceBadge } from "./ServiceBadge";
import { ServiceSelector } from "./ServiceSelector";

const MIN_TIP_CENTS = 1;
const MAX_TIP_CENTS = 50_000;

function LiveDateTimeBadge() {
  const [clock, setClock] = useState(getCurrentSaoPauloDateTime);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = getCurrentSaoPauloDateTime();
      setClock((current) =>
        current.time === next.time && current.fullDate === next.fullDate
          ? current
          : next,
      );
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div
      aria-label={`Hoje, ${clock.fullDate} às ${clock.time}`}
      className="flex shrink-0 items-center gap-2 rounded-xl border border-[#dce5dd] bg-white px-2.5 py-1.5 shadow-[0_0.2rem_0.6rem_rgb(23_33_27/4%)] sm:px-3 sm:py-2"
    >
      <CalendarDays
        aria-hidden="true"
        className="shrink-0 text-[#4a7957]"
        size={18}
      />
      <div className="grid leading-tight">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#4a7957]">
          Hoje
        </span>
        <span className="whitespace-nowrap text-xs font-bold tabular-nums text-[#17211b]">
          <span className="sm:hidden">{clock.shortDate}</span>
          <span className="hidden sm:inline">{clock.fullDate}</span>
          {" · "}
          {clock.time}
        </span>
      </div>
    </div>
  );
}

export function DailyOperation() {
  const { role } = useAuth();
  const [services, setServices] = useState<ServiceType[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [includeTip, setIncludeTip] = useState(false);
  const [tipCents, setTipCents] = useState(0);
  const [tipTouched, setTipTouched] = useState(false);
  const [differentTipPaymentMethod, setDifferentTipPaymentMethod] =
    useState(false);
  const [tipPaymentMethod, setTipPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPackCut, setSubmittingPackCut] = useState(false);
  const [submittingLoyaltyCut, setSubmittingLoyaltyCut] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientInitialName, setNewClientInitialName] = useState("");
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [purchaseTargetClient, setPurchaseTargetClient] =
    useState<Client | null>(null);
  const [historyTargetClient, setHistoryTargetClient] =
    useState<Client | null>(null);
  const tipInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void listServiceTypes()
      .then(setServices)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar os serviços:", cause);
        setLoadError(
          getApiErrorMessage(cause, "Não foi possível carregar os serviços."),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function resetTipState() {
    setIncludeTip(false);
    setTipCents(0);
    setTipTouched(false);
    setDifferentTipPaymentMethod(false);
    setTipPaymentMethod(null);
  }

  function resetFormState() {
    setSelectedService(null);
    setPaymentMethod(null);
    resetTipState();
    setSubmitError(null);
  }

  function chooseService(service: ServiceType) {
    setSelectedService(service);
    setPaymentMethod(null);
    resetTipState();
    setSuccess(null);
    setSubmitError(null);
  }

  function handleToggleIncludeTip(checked: boolean) {
    if (!checked) {
      resetTipState();
      return;
    }
    setIncludeTip(true);
    window.requestAnimationFrame(() => {
      tipInputRef.current?.focus();
    });
  }

  function handleToggleDifferentTipPayment(checked: boolean) {
    setDifferentTipPaymentMethod(checked);
    if (!checked) {
      setTipPaymentMethod(null);
    }
  }

  const tipExceedsMax = includeTip && tipCents > MAX_TIP_CENTS;
  const tipBelowMin = includeTip && tipCents < MIN_TIP_CENTS;
  const missingTipPaymentMethod =
    includeTip && differentTipPaymentMethod && !tipPaymentMethod;
  const isTipValid =
    !includeTip ||
    (tipCents >= MIN_TIP_CENTS &&
      tipCents <= MAX_TIP_CENTS &&
      !missingTipPaymentMethod);

  async function handleSubmit() {
    if (!selectedService || !paymentMethod || submitting) return;
    if (includeTip) {
      setTipTouched(true);
      if (tipCents < MIN_TIP_CENTS) {
        setSubmitError("Informe um valor de gorjeta de pelo menos R$ 0,01.");
        return;
      }
      if (tipCents > MAX_TIP_CENTS) {
        setSubmitError("O valor máximo permitido para gorjeta é R$ 500,00.");
        return;
      }
      if (differentTipPaymentMethod && !tipPaymentMethod) {
        setSubmitError("Selecione a forma de pagamento da gorjeta.");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      const payload: CreateServiceRecordInput = {
        serviceTypeId: selectedService.id,
        paymentMethod,
        ...(selectedClient ? { clientId: selectedClient.id } : {}),
        ...(includeTip
          ? {
              tipCents: Math.trunc(tipCents),
              ...(differentTipPaymentMethod &&
              tipPaymentMethod &&
              tipPaymentMethod !== paymentMethod
                ? { tipPaymentMethod }
                : {}),
            }
          : {}),
      };
      const createdRecord = await createServiceRecord(payload);
      const serviceTitle = createdRecord.serviceName || selectedService.name;
      const recordedTipCents = createdRecord.tipCents ?? 0;
      const recordedTotalCents =
        createdRecord.totalCents ?? createdRecord.priceCents + recordedTipCents;
      const clientSuffix = selectedClient ? ` (${selectedClient.name})` : "";
      const loyaltySummary = createdRecord.loyaltySummary;
      const loyaltySuffix = loyaltySummary
        ? loyaltySummary.freeCutAvailable
          ? " · Fidelidade: 10/10 (Corte Grátis disponível!)"
          : createdRecord.countsForLoyalty
            ? ` · Fidelidade: ${loyaltySummary.currentCuts}/${loyaltySummary.targetCuts}`
            : ""
        : "";

      if (role === "daily_operator") {
        setSuccess(
          recordedTipCents > 0
            ? `${serviceTitle}${clientSuffix} registrado com sucesso · Minha parte: ${formatCurrency(createdRecord.operatorShareCents)} (Serviço: ${formatCurrency(createdRecord.priceCents)} + Gorjeta: ${formatCurrency(recordedTipCents)}).${loyaltySuffix}`
            : `${serviceTitle}${clientSuffix} registrado com sucesso · Minha parte (50%): ${formatCurrency(createdRecord.operatorShareCents)} (Bruto: ${formatCurrency(createdRecord.priceCents)}).${loyaltySuffix}`,
        );
      } else {
        setSuccess(
          recordedTipCents > 0
            ? `${serviceTitle}${clientSuffix} registrado com sucesso · Total: ${formatCurrency(recordedTotalCents)} (inclui ${formatCurrency(recordedTipCents)} de gorjeta).${loyaltySuffix}`
            : `${serviceTitle}${clientSuffix} registrado com sucesso.${loyaltySuffix}`,
        );
      }

      resetFormState();
      setSelectedClient(null);
    } catch (cause: unknown) {
      console.error("Não foi possível registrar o atendimento:", cause);
      setSubmitError(
        getApiErrorMessage(cause, "Não foi possível registrar o atendimento."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeemPackCut(options: {
    tipCents?: number;
    tipPaymentMethod?: PaymentMethod;
    notes?: string;
  }) {
    if (!selectedClient || submittingPackCut || submittingLoyaltyCut || submitting) {
      return;
    }

    setSubmittingPackCut(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      const createdRecord = await createServiceRecord({
        clientId: selectedClient.id,
        useActivePack: true,
        ...(options.tipCents && options.tipCents > 0
          ? {
              tipCents: options.tipCents,
              tipPaymentMethod: options.tipPaymentMethod,
            }
          : {}),
        ...(options.notes ? { notes: options.notes } : {}),
      });

      const summary = createdRecord.packSummary;
      const operatorSuffix =
        role === "daily_operator"
          ? ` · Minha parte: ${formatCurrency(createdRecord.operatorShareCents)} (Ref.: ${formatCurrency(createdRecord.priceCents)})`
          : " · Valor já recebido na compra do pacote";

      if (summary?.needsRenewal || summary?.remainingCuts === 0) {
        setSuccess(
          `Último corte do pacote utilizado para ${selectedClient.name}! Cliente precisa renovar.${operatorSuffix}`,
        );
      } else if (summary) {
        setSuccess(
          `Corte registrado! Restam ${summary.remainingCuts} de ${summary.totalCuts} cortes no pacote de ${selectedClient.name}.${operatorSuffix}`,
        );
      } else {
        setSuccess(
          `Corte do pacote registrado para ${selectedClient.name}!${operatorSuffix}`,
        );
      }

      try {
        const refreshed = await getClient(selectedClient.id);
        setSelectedClient(refreshed);
      } catch {
        if (summary && selectedClient.activePack) {
          setSelectedClient({
            ...selectedClient,
            activePack: {
              ...selectedClient.activePack,
              ...summary,
            },
          });
        }
      }
    } catch (cause: unknown) {
      console.error("Não foi possível registrar o corte do pacote:", cause);
      setSubmitError(
        getApiErrorMessage(
          cause,
          "Não foi possível registrar o corte do pacote.",
        ),
      );
    } finally {
      setSubmittingPackCut(false);
    }
  }

  async function handleRedeemLoyaltyCut(options: {
    tipCents?: number;
    tipPaymentMethod?: PaymentMethod;
    notes?: string;
  }) {
    if (
      !selectedClient ||
      submittingLoyaltyCut ||
      submittingPackCut ||
      submitting
    ) {
      return;
    }

    setSubmittingLoyaltyCut(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      const createdRecord = await createServiceRecord({
        clientId: selectedClient.id,
        useLoyaltyReward: true,
        ...(options.tipCents && options.tipCents > 0
          ? {
              tipCents: options.tipCents,
              tipPaymentMethod: options.tipPaymentMethod,
            }
          : {}),
        ...(options.notes ? { notes: options.notes } : {}),
      });

      const tipValue = createdRecord.tipCents ?? 0;
      const operatorSuffix =
        role === "daily_operator"
          ? ` · Minha parte: ${formatCurrency(createdRecord.operatorShareCents)}${
              tipValue > 0
                ? ` (inclui ${formatCurrency(tipValue)} de gorjeta)`
                : ""
            }`
          : tipValue > 0
            ? ` · Gorjeta: ${formatCurrency(tipValue)}`
            : " · Cortesia (R$ 0,00)";

      setSuccess(
        `Corte gratuito de fidelidade resgatado para ${selectedClient.name}! Contador reiniciado para 0/10.${operatorSuffix}`,
      );

      try {
        const refreshed = await getClient(selectedClient.id);
        setSelectedClient(refreshed);
      } catch {
        if (createdRecord.loyaltySummary) {
          setSelectedClient({
            ...selectedClient,
            loyalty: createdRecord.loyaltySummary,
          });
        }
      }
    } catch (cause: unknown) {
      console.error("Não foi possível resgatar o corte de fidelidade:", cause);
      setSubmitError(
        getApiErrorMessage(
          cause,
          "Não foi possível resgatar o corte gratuito de fidelidade.",
        ),
      );
    } finally {
      setSubmittingLoyaltyCut(false);
    }
  }

  function handleClientCreated(client: Client) {
    setRegistrationModalOpen(false);
    setSelectedClient(client);
    setSuccess(`Cliente ${client.name} cadastrado e selecionado.`);
  }

  function handlePackPurchased(
    updatedClient: Client,
    createdPack: ClientPackDetail,
  ) {
    setPurchaseTargetClient(null);
    setSelectedClient(updatedClient);
    if ((createdPack.usedCuts ?? 0) > 0) {
      setSuccess(
        `Pacote "${createdPack.planName}" ativado e 1º corte registrado para ${updatedClient.name}! Restam ${createdPack.remainingCuts} cortes disponíveis.`,
      );
    } else {
      setSuccess(
        `Pacote "${createdPack.planName}" ativado para ${updatedClient.name} (${createdPack.remainingCuts} cortes disponíveis).`,
      );
    }
  }

  const effectiveDifferentTipMethod =
    includeTip &&
    differentTipPaymentMethod &&
    tipPaymentMethod &&
    tipPaymentMethod !== paymentMethod
      ? tipPaymentMethod
      : null;

  return (
    <section className="grid gap-6">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            DailyCheckout
          </p>
          <h1 className="mb-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
            Operação diária
          </h1>
        </div>
        <LiveDateTimeBadge />
      </div>

      {loading && <EmptyState>Carregando serviços disponíveis...</EmptyState>}
      {!loading && loadError && (
        <EmptyState
          icon={<AlertCircle size={28} />}
          onClose={() => setLoadError(null)}
          title="Não foi possível carregar os serviços"
        >
          {loadError}
        </EmptyState>
      )}
      {!loading && !loadError && services.length === 0 && (
        <EmptyState
          icon={<Scissors size={28} />}
          title="Nenhum serviço disponível"
        >
          Cadastre um serviço ativo para começar a registrar atendimentos.
        </EmptyState>
      )}
      {!loading && !loadError && services.length > 0 && (
        <div className="mx-auto grid w-full max-w-[42rem] gap-5">
          {success && (
            <FeedbackMessage
              message={success}
              onClose={() => setSuccess(null)}
            />
          )}

          {submitError && !selectedService && (
            <FeedbackMessage
              message={submitError}
              onClose={() => setSubmitError(null)}
              variant="error"
            />
          )}

          <ClientQuickPicker
            hasSelectedStandaloneService={Boolean(selectedService)}
            onOpenHistory={(client) => setHistoryTargetClient(client)}
            onOpenNewClient={(initialName = "") => {
              setNewClientInitialName(initialName);
              setRegistrationModalOpen(true);
            }}
            onOpenPurchasePack={(client) => setPurchaseTargetClient(client)}
            onRedeemLoyaltyCut={handleRedeemLoyaltyCut}
            onRedeemPackCut={handleRedeemPackCut}
            onSelectClient={(client) => {
              setSelectedClient(client);
              setSubmitError(null);
            }}
            selectedClient={selectedClient}
            submittingLoyaltyCut={submittingLoyaltyCut}
            submittingPackCut={submittingPackCut}
          />

          {!selectedService ? (
            <div className="motion-content grid gap-2.5">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                {selectedClient
                  ? `Ou selecione um serviço avulso para ${selectedClient.name}`
                  : "Registrar serviço avulso"}
              </p>
              <ServiceSelector onSelect={chooseService} services={services} />
            </div>
          ) : (
            <Panel
              className="motion-content grid gap-5"
              key={selectedService.id}
            >
              <div className="grid gap-3.5">
                <div className="flex items-center gap-4">
                  <IconButton
                    aria-label="Voltar para serviços"
                    icon={<ArrowLeft size={18} />}
                    onClick={resetFormState}
                    title="Voltar para serviços"
                    type="button"
                  />
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                    Registrar atendimento
                  </p>
                </div>
                <ServiceBadge service={selectedService} />
                {selectedClient &&
                  getClientLoyalty(selectedClient).freeCutAvailable &&
                  isLoyaltyEligibleServiceName(selectedService.name) && (
                    <p className="m-0 rounded-xl border border-[#ead9a6] bg-[#fff9e8] px-3.5 py-2.5 text-xs font-medium text-[#805d12]">
                      Cliente já atingiu 10/10 — este corte avulso não acumula
                      para o próximo prêmio. Para usar o prêmio, volte e clique
                      em Resgatar Corte Grátis.
                    </p>
                  )}
              </div>

              <PaymentMethodSelector
                onChange={setPaymentMethod}
                value={paymentMethod}
              />

              <div className="grid gap-3 border-t border-[#e8eee9] pt-4">
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-sm font-bold text-[#34443a] transition-[background-color,border-color] duration-180 ${
                    includeTip
                      ? "border-[#4a7957] bg-[#e8f2ea]"
                      : "border-[#dce5dd] bg-white"
                  }`}
                >
                  <input
                    checked={includeTip}
                    className="h-4 w-4 accent-[#2f6840]"
                    onChange={(event) =>
                      handleToggleIncludeTip(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Incluir gorjeta</span>
                </label>

                {includeTip && (
                  <div className="motion-content grid gap-3.5 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                    <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
                      Valor da gorjeta
                      <CurrencyInput
                        aria-invalid={
                          tipExceedsMax || (tipTouched && tipBelowMin)
                        }
                        className={`min-h-12 w-full rounded-[0.6rem] border bg-white px-3.5 py-2.5 text-lg font-bold tracking-tight text-[#23372a] focus-visible:outline-2 ${
                          tipExceedsMax || (tipTouched && tipBelowMin)
                            ? "border-[#a83e3e] focus-visible:outline-[#a83e3e]"
                            : "border-[#c8d6ca] focus-visible:outline-[#2f6840]"
                        }`}
                        maxDigits={7}
                        onChangeCents={(nextCents) => {
                          setTipCents(nextCents);
                          setTipTouched(true);
                          if (submitError) {
                            setSubmitError(null);
                          }
                        }}
                        ref={tipInputRef}
                        valueCents={tipCents}
                      />
                      {tipExceedsMax ? (
                        <span
                          className="text-xs font-medium text-[#a83e3e]"
                          role="alert"
                        >
                          O valor máximo permitido para gorjeta é R$ 500,00.
                        </span>
                      ) : tipTouched && tipBelowMin ? (
                        <span
                          className="text-xs font-medium text-[#a83e3e]"
                          role="alert"
                        >
                          Informe um valor de gorjeta de pelo menos R$ 0,01.
                        </span>
                      ) : (
                        <span className="text-xs font-normal text-[#617067]">
                          Digite apenas números (mín. R$ 0,01 · máx. R$ 500,00).
                        </span>
                      )}
                    </label>

                    <label
                      className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-sm font-medium text-[#34443a] transition-[background-color,border-color] duration-180 ${
                        differentTipPaymentMethod
                          ? "border-[#4a7957] bg-[#e8f2ea]"
                          : "border-[#dce5dd] bg-white"
                      }`}
                    >
                      <input
                        checked={differentTipPaymentMethod}
                        className="h-4 w-4 accent-[#2f6840]"
                        onChange={(event) =>
                          handleToggleDifferentTipPayment(event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>Gorjeta em outra forma de pagamento</span>
                    </label>

                    {differentTipPaymentMethod ? (
                      <div className="motion-content rounded-lg bg-white p-3">
                        <PaymentMethodSelector
                          legend="Forma de pagamento da gorjeta"
                          name="tip-payment-method"
                          onChange={(method) => {
                            setTipPaymentMethod(method);
                            if (submitError) {
                              setSubmitError(null);
                            }
                          }}
                          value={tipPaymentMethod}
                        />
                      </div>
                    ) : (
                      paymentMethod && (
                        <p className="m-0 text-xs text-[#617067]">
                          Gorjeta na mesma forma de pagamento do serviço (
                          <strong className="text-[#34443a]">
                            {paymentMethodLabel(paymentMethod)}
                          </strong>
                          ).
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>

              {includeTip &&
                tipCents >= MIN_TIP_CENTS &&
                tipCents <= MAX_TIP_CENTS && (
                  <div
                    aria-label="Resumo de confirmação"
                    className="motion-content grid gap-2 rounded-xl border border-[#c8d6ca] bg-[#f5f7f4] p-3.5 text-sm text-[#34443a]"
                  >
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-[#4a7957]">
                      Resumo de confirmação
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#617067]">
                        Serviço ({selectedService.name}
                        {paymentMethod
                          ? ` · ${paymentMethodLabel(paymentMethod)}`
                          : ""}
                        )
                      </span>
                      <strong className="shrink-0 text-[#23372a]">
                        {formatCurrency(selectedService.priceCents)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#617067]">
                        Gorjeta
                        {effectiveDifferentTipMethod
                          ? ` (${paymentMethodLabel(effectiveDifferentTipMethod)})`
                          : ""}
                      </span>
                      <strong className="shrink-0 text-[#2f6840]">
                        + {formatCurrency(tipCents)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#dce5dd] pt-2 text-base">
                      <strong className="text-[#23372a]">Total</strong>
                      <strong className="shrink-0 text-[#2f6840]">
                        {formatCurrency(selectedService.priceCents + tipCents)}
                      </strong>
                    </div>
                  </div>
                )}

              {submitError && (
                <FeedbackMessage
                  message={submitError}
                  onClose={() => setSubmitError(null)}
                  variant="error"
                />
              )}

              <Button
                disabled={!paymentMethod || !isTipValid || submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Registrando..." : "Confirmar atendimento"}
              </Button>
            </Panel>
          )}
        </div>
      )}

      <AnimatePresence>
        {registrationModalOpen && (
          <ClientRegistrationModal
            initialName={newClientInitialName}
            key="client-registration-modal"
            onClose={() => setRegistrationModalOpen(false)}
            onSaved={handleClientCreated}
          />
        )}

        {historyTargetClient && (
          <ClientDetailsModal
            client={historyTargetClient}
            key={`client-details-${historyTargetClient.id}`}
            onClientUpdated={(updated) => {
              setSelectedClient((current) =>
                current && current.id === updated.id ? updated : current,
              );
              setHistoryTargetClient((current) =>
                current && current.id === updated.id ? updated : current,
              );
            }}
            onClose={() => setHistoryTargetClient(null)}
            onRequestRenew={(client) => setPurchaseTargetClient(client)}
          />
        )}

        {purchaseTargetClient && (
          <PackPurchaseModal
            client={purchaseTargetClient}
            key={`pack-purchase-${purchaseTargetClient.id}`}
            onClose={() => setPurchaseTargetClient(null)}
            onPurchased={handlePackPurchased}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
