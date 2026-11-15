import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  PackagePlus,
  Phone,
  Scissors,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { subscribeClientInvalidation } from "../../api/clientInvalidation";
import {
  cancelClientPack,
  cancelServiceRecord,
  createServiceRecord,
  getClient,
  getClientPack,
  listClientPacks,
  listClientServiceRecords,
} from "../../api/dailyCheckoutApi";
import type {
  Client,
  ClientPackDetail,
  ClientServiceRecordItem,
  ClientServiceRecordsFilterType,
  ClientServiceRecordsSummary,
  PaymentMethod,
} from "../../api/types";
import { useAuth } from "../../auth/authContext";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCpf,
  formatCurrency,
  formatDayMonthSaoPaulo,
  formatPhone,
} from "../../lib/formatters";
import { ClientPacksTab } from "./ClientPacksTab";
import { ClientServiceHistoryTab } from "./ClientServiceHistoryTab";
import { LoyaltyRedeemFields } from "./LoyaltyRedeemFields";
import { LoyaltyStampGrid } from "./LoyaltyStampGrid";
import {
  formatLoyaltyRemainingLabel,
  getClientLoyalty,
  getOptionalTipError,
} from "./loyaltyUtils";

const SERVICE_RECORDS_PAGE_LIMIT = 20;
const MAX_SERVICE_RECORDS_PAGE_LIMIT = 50;

type DetailsTab = "services" | "packs";

function pickPreferredPackId(
  list: ClientPackDetail[],
  preferredPackId?: string,
  activePackId?: string,
): string {
  if (preferredPackId && list.some((item) => item.id === preferredPackId)) {
    return preferredPackId;
  }
  if (activePackId && list.some((item) => item.id === activePackId)) {
    return activePackId;
  }
  return list.find((item) => item.status === "active")?.id ?? list[0]?.id ?? "";
}

export function ClientDetailsModal({
  client,
  onClose,
  onClientUpdated,
  onRequestRenew,
}: {
  client: Client;
  onClose: () => void;
  onClientUpdated: (updatedClient: Client) => void;
  onRequestRenew?: (client: Client) => void;
}) {
  const { role } = useAuth();
  const [currentClient, setCurrentClient] = useState<Client>(client);
  const [activeTab, setActiveTab] = useState<DetailsTab>("services");

  const [filterType, setFilterType] =
    useState<ClientServiceRecordsFilterType>("all");
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [summary, setSummary] = useState<ClientServiceRecordsSummary | null>(
    null,
  );
  const [serviceItems, setServiceItems] = useState<ClientServiceRecordItem[]>(
    [],
  );
  const [serviceTotal, setServiceTotal] = useState(0);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceLoadingMore, setServiceLoadingMore] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceLoadMoreError, setServiceLoadMoreError] = useState<
    string | null
  >(null);
  const [serviceRefreshNonce, setServiceRefreshNonce] = useState(0);

  const [packs, setPacks] = useState<ClientPackDetail[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>(
    client.activePack?.id ?? "",
  );
  const [selectedPackDetail, setSelectedPackDetail] =
    useState<ClientPackDetail | null>(null);
  const [packsLoading, setPacksLoading] = useState(true);
  const [loadingPackDetail, setLoadingPackDetail] = useState(false);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [packDetailError, setPackDetailError] = useState<string | null>(null);
  const [packsRefreshNonce, setPacksRefreshNonce] = useState(0);

  const [redeemingPackCut, setRedeemingPackCut] = useState(false);
  const [redeemingLoyaltyCut, setRedeemingLoyaltyCut] = useState(false);
  const [redeemLoyaltyOpen, setRedeemLoyaltyOpen] = useState(false);
  const [loyaltyIncludeTip, setLoyaltyIncludeTip] = useState(false);
  const [loyaltyTipCents, setLoyaltyTipCents] = useState(0);
  const [loyaltyTipTouched, setLoyaltyTipTouched] = useState(false);
  const [loyaltyTipPaymentMethod, setLoyaltyTipPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [loyaltyNotes, setLoyaltyNotes] = useState("");
  const [cancelingRecordId, setCancelingRecordId] = useState<string | null>(
    null,
  );
  const [cancelingPack, setCancelingPack] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const serviceRequestIdRef = useRef(0);
  const packsRequestIdRef = useRef(0);
  const selectedPackIdRef = useRef(client.activePack?.id ?? "");
  const suppressInvalidationRef = useRef(false);
  const onClientUpdatedRef = useRef(onClientUpdated);
  const loyaltyTipInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onClientUpdatedRef.current = onClientUpdated;
  }, [onClientUpdated]);

  useEffect(() => {
    selectedPackIdRef.current = selectedPackId;
  }, [selectedPackId]);

  useEffect(() => {
    let active = true;
    const requestId = ++packsRequestIdRef.current;

    const clientPromise = getClient(client.id)
      .then((freshClient) => {
        if (!active || requestId !== packsRequestIdRef.current) {
          return null;
        }
        setCurrentClient(freshClient);
        onClientUpdatedRef.current(freshClient);
        return freshClient;
      })
      .catch(() => null);

    const packsPromise = listClientPacks(client.id);

    void Promise.allSettled([clientPromise, packsPromise]).then(
      async ([clientResult, packsResult]) => {
        if (!active || requestId !== packsRequestIdRef.current) {
          return;
        }
        const freshClient =
          clientResult.status === "fulfilled" ? clientResult.value : null;

        if (packsResult.status === "rejected") {
          setPacksError(
            getApiErrorMessage(
              packsResult.reason,
              "Não foi possível carregar o histórico de pacotes do cliente.",
            ),
          );
          setPacksLoading(false);
          return;
        }

        const list = packsResult.value;
        setPacks(list);
        setPacksError(null);
        setPackDetailError(null);

        const targetId = pickPreferredPackId(
          list,
          selectedPackIdRef.current,
          freshClient?.activePack?.id,
        );
        setSelectedPackId(targetId);

        if (!targetId) {
          setSelectedPackDetail(null);
          setPacksLoading(false);
          return;
        }

        setPacksLoading(false);
        setLoadingPackDetail(true);
        try {
          const detail = await getClientPack(targetId);
          if (active && requestId === packsRequestIdRef.current) {
            setSelectedPackDetail(detail);
          }
        } catch (cause: unknown) {
          if (active && requestId === packsRequestIdRef.current) {
            const fallback = list.find((item) => item.id === targetId) ?? null;
            setSelectedPackDetail(fallback);
            setPackDetailError(
              getApiErrorMessage(
                cause,
                "Não foi possível carregar os detalhes deste pacote.",
              ),
            );
          }
        } finally {
          if (active && requestId === packsRequestIdRef.current) {
            setLoadingPackDetail(false);
          }
        }
      },
    );

    return () => {
      active = false;
    };
  }, [client.id, packsRefreshNonce]);

  useEffect(() => {
    let active = true;
    const requestId = ++serviceRequestIdRef.current;

    void listClientServiceRecords(client.id, {
      type: filterType,
      includeCanceled,
      limit: SERVICE_RECORDS_PAGE_LIMIT,
      offset: 0,
    })
      .then((response) => {
        if (!active || requestId !== serviceRequestIdRef.current) {
          return;
        }
        setSummary(response.summary);
        setServiceItems(response.items);
        setServiceTotal(response.total);
        setServiceError(null);
        setServiceLoadMoreError(null);
      })
      .catch((cause: unknown) => {
        if (!active || requestId !== serviceRequestIdRef.current) {
          return;
        }
        setServiceError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar o histórico de atendimentos.",
          ),
        );
      })
      .finally(() => {
        if (active && requestId === serviceRequestIdRef.current) {
          setServiceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [client.id, filterType, includeCanceled, serviceRefreshNonce]);

  useEffect(() => {
    return subscribeClientInvalidation((invalidatedClientId) => {
      if (
        invalidatedClientId !== client.id ||
        suppressInvalidationRef.current
      ) {
        return;
      }
      setServiceLoading(true);
      setServiceError(null);
      setServiceLoadMoreError(null);
      setPacksLoading(true);
      setPacksError(null);
      setServiceRefreshNonce((n) => n + 1);
      setPacksRefreshNonce((n) => n + 1);
    });
  }, [client.id]);

  async function refreshAllAfterMutation(
    preferredPackId?: string,
  ): Promise<{ client: Client; clientRefreshed: boolean }> {
    const refreshLimit = Math.min(
      MAX_SERVICE_RECORDS_PAGE_LIMIT,
      Math.max(SERVICE_RECORDS_PAGE_LIMIT, serviceItems.length),
    );
    const serviceReqId = ++serviceRequestIdRef.current;
    const packsReqId = ++packsRequestIdRef.current;

    const [clientResult, recordsResult, packsResult] = await Promise.allSettled([
      getClient(client.id),
      listClientServiceRecords(client.id, {
        type: filterType,
        includeCanceled,
        limit: refreshLimit,
        offset: 0,
      }),
      listClientPacks(client.id),
    ]);

    let latestClient = currentClient;
    let clientRefreshed = false;
    if (clientResult.status === "fulfilled") {
      latestClient = clientResult.value;
      clientRefreshed = true;
      setCurrentClient(latestClient);
      onClientUpdatedRef.current(latestClient);
    }

    if (
      recordsResult.status === "fulfilled" &&
      serviceReqId === serviceRequestIdRef.current
    ) {
      setSummary(recordsResult.value.summary);
      setServiceItems(recordsResult.value.items);
      setServiceTotal(recordsResult.value.total);
      setServiceError(null);
      setServiceLoadMoreError(null);
    } else if (
      recordsResult.status === "rejected" &&
      serviceReqId === serviceRequestIdRef.current
    ) {
      setServiceError(
        getApiErrorMessage(
          recordsResult.reason,
          "Não foi possível atualizar o histórico de atendimentos.",
        ),
      );
    }

    if (
      packsResult.status === "fulfilled" &&
      packsReqId === packsRequestIdRef.current
    ) {
      const list = packsResult.value;
      setPacks(list);
      setPacksError(null);
      setPackDetailError(null);

      const targetId = pickPreferredPackId(
        list,
        preferredPackId ?? selectedPackIdRef.current,
        latestClient.activePack?.id,
      );
      setSelectedPackId(targetId);

      if (targetId) {
        try {
          const detail = await getClientPack(targetId);
          if (packsReqId === packsRequestIdRef.current) {
            setSelectedPackDetail(detail);
          }
        } catch {
          if (packsReqId === packsRequestIdRef.current) {
            setSelectedPackDetail(
              list.find((item) => item.id === targetId) ?? null,
            );
          }
        }
      } else {
        setSelectedPackDetail(null);
      }
    } else if (
      packsResult.status === "rejected" &&
      packsReqId === packsRequestIdRef.current
    ) {
      setPacksError(
        getApiErrorMessage(
          packsResult.reason,
          "Não foi possível atualizar o histórico de pacotes.",
        ),
      );
    }

    return { client: latestClient, clientRefreshed };
  }

  function handleFilterTypeChange(nextType: ClientServiceRecordsFilterType) {
    if (nextType === filterType) return;
    setServiceLoading(true);
    setServiceError(null);
    setServiceLoadMoreError(null);
    setFilterType(nextType);
  }

  function handleToggleIncludeCanceled(checked: boolean) {
    setServiceLoading(true);
    setServiceError(null);
    setServiceLoadMoreError(null);
    setIncludeCanceled(checked);
  }

  function handleRetryServiceRecords() {
    setServiceLoading(true);
    setServiceError(null);
    setServiceLoadMoreError(null);
    setServiceRefreshNonce((n) => n + 1);
  }

  function handleRetryPacks() {
    setPacksLoading(true);
    setPacksError(null);
    setPackDetailError(null);
    setPacksRefreshNonce((n) => n + 1);
  }

  async function handleLoadMoreRecords() {
    if (serviceLoadingMore || serviceLoading || serviceItems.length >= serviceTotal) {
      return;
    }

    const requestId = serviceRequestIdRef.current;
    setServiceLoadingMore(true);
    setServiceLoadMoreError(null);
    try {
      const response = await listClientServiceRecords(client.id, {
        type: filterType,
        includeCanceled,
        limit: SERVICE_RECORDS_PAGE_LIMIT,
        offset: serviceItems.length,
      });
      if (requestId !== serviceRequestIdRef.current) {
        return;
      }
      setSummary(response.summary);
      setServiceTotal(response.total);
      setServiceItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        const nextItems = response.items.filter((item) => !seen.has(item.id));
        return [...current, ...nextItems];
      });
    } catch (cause: unknown) {
      if (requestId === serviceRequestIdRef.current) {
        setServiceLoadMoreError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar mais atendimentos.",
          ),
        );
      }
    } finally {
      if (requestId === serviceRequestIdRef.current) {
        setServiceLoadingMore(false);
      }
    }
  }

  async function handleSelectPack(packId: string) {
    const requestId = ++packsRequestIdRef.current;
    setSelectedPackId(packId);
    setLoadingPackDetail(true);
    setPackDetailError(null);
    try {
      const detail = await getClientPack(packId);
      if (requestId === packsRequestIdRef.current) {
        setSelectedPackDetail(detail);
      }
    } catch (cause: unknown) {
      if (requestId === packsRequestIdRef.current) {
        const fallback = packs.find((item) => item.id === packId) ?? null;
        setSelectedPackDetail(fallback);
        setPackDetailError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar os cortes deste pacote.",
          ),
        );
      }
    } finally {
      if (requestId === packsRequestIdRef.current) {
        setLoadingPackDetail(false);
      }
    }
  }

  async function handleQuickRedeemCut() {
    const activePack = currentClient.activePack;
    if (
      !activePack ||
      activePack.status !== "active" ||
      activePack.remainingCuts <= 0 ||
      redeemingPackCut ||
      redeemingLoyaltyCut ||
      Boolean(cancelingRecordId) ||
      cancelingPack
    ) {
      return;
    }

    setRedeemingPackCut(true);
    setActionError(null);
    setActionFeedback(null);
    suppressInvalidationRef.current = true;
    try {
      const record = await createServiceRecord({
        clientId: currentClient.id,
        useActivePack: true,
      });
      suppressInvalidationRef.current = false;

      const { client: refreshedClient, clientRefreshed } =
        await refreshAllAfterMutation(activePack.id);
      let effectiveClient = refreshedClient;
      if (!clientRefreshed) {
        effectiveClient = {
          ...currentClient,
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
        setCurrentClient(effectiveClient);
        onClientUpdatedRef.current(effectiveClient);
      }

      const packSummary = record.packSummary ?? effectiveClient.activePack;
      const shareText =
        role === "daily_operator"
          ? ` · Minha parte: ${formatCurrency(record.operatorShareCents)}`
          : "";

      if (packSummary?.needsRenewal || packSummary?.remainingCuts === 0) {
        setActionFeedback(
          `Último corte do pacote descontado! Cliente precisa renovar.${shareText}`,
        );
      } else if (packSummary) {
        setActionFeedback(
          `Corte descontado! Restam ${packSummary.remainingCuts} de ${packSummary.totalCuts} cortes.${shareText}`,
        );
      } else {
        setActionFeedback(`Corte do pacote registrado com sucesso!${shareText}`);
      }
    } catch (cause: unknown) {
      setActionError(
        getApiErrorMessage(
          cause,
          "Não foi possível descontar o corte do pacote.",
        ),
      );
    } finally {
      suppressInvalidationRef.current = false;
      setRedeemingPackCut(false);
    }
  }

  function resetLoyaltyRedeemInputs() {
    setLoyaltyIncludeTip(false);
    setLoyaltyTipCents(0);
    setLoyaltyTipTouched(false);
    setLoyaltyTipPaymentMethod("pix");
    setLoyaltyNotes("");
  }

  function handleToggleLoyaltyTip(checked: boolean) {
    setLoyaltyIncludeTip(checked);
    setLoyaltyTipTouched(false);
    if (actionError) setActionError(null);
    if (!checked) {
      setLoyaltyTipCents(0);
      return;
    }
    window.requestAnimationFrame(() => {
      loyaltyTipInputRef.current?.focus();
    });
  }

  async function handleConfirmLoyaltyRedeem() {
    const currentLoyalty = getClientLoyalty(currentClient);
    if (
      !currentLoyalty.freeCutAvailable ||
      redeemingLoyaltyCut ||
      redeemingPackCut ||
      Boolean(cancelingRecordId) ||
      cancelingPack
    ) {
      return;
    }

    const tipValidationError = getOptionalTipError(
      loyaltyIncludeTip,
      loyaltyTipCents,
    );
    if (tipValidationError) {
      setLoyaltyTipTouched(true);
      setActionError(tipValidationError);
      return;
    }

    setRedeemingLoyaltyCut(true);
    setActionError(null);
    setActionFeedback(null);
    suppressInvalidationRef.current = true;
    try {
      const record = await createServiceRecord({
        clientId: currentClient.id,
        useLoyaltyReward: true,
        ...(loyaltyIncludeTip
          ? {
              tipCents: Math.trunc(loyaltyTipCents),
              tipPaymentMethod: loyaltyTipPaymentMethod,
            }
          : {}),
        ...(loyaltyNotes.trim() ? { notes: loyaltyNotes.trim() } : {}),
      });
      suppressInvalidationRef.current = false;

      const { clientRefreshed } = await refreshAllAfterMutation(
        selectedPackIdRef.current,
      );
      if (!clientRefreshed) {
        const updatedClient: Client = {
          ...currentClient,
          loyalty: record.loyaltySummary ?? {
            currentCuts: 0,
            targetCuts: currentLoyalty.targetCuts,
            remainingCuts: currentLoyalty.targetCuts,
            freeCutAvailable: false,
            totalRewardsRedeemed: currentLoyalty.totalRewardsRedeemed + 1,
          },
        };
        setCurrentClient(updatedClient);
        onClientUpdatedRef.current(updatedClient);
      }

      setRedeemLoyaltyOpen(false);
      resetLoyaltyRedeemInputs();

      const shareText =
        role === "daily_operator"
          ? ` · Minha parte: ${formatCurrency(record.operatorShareCents)}`
          : "";
      setActionFeedback(
        `Corte gratuito de fidelidade resgatado! Contador reiniciado para 0/${currentLoyalty.targetCuts}.${shareText}`,
      );
    } catch (cause: unknown) {
      setActionError(
        getApiErrorMessage(
          cause,
          "Não foi possível resgatar o corte gratuito de fidelidade.",
        ),
      );
    } finally {
      suppressInvalidationRef.current = false;
      setRedeemingLoyaltyCut(false);
    }
  }

  async function handleCancelRecord(
    recordId: string,
    options: {
      isPackCut: boolean;
      isLoyaltyReward?: boolean;
      countsForLoyalty?: boolean;
      serviceName: string;
    },
  ) {
    if (
      redeemingPackCut ||
      redeemingLoyaltyCut ||
      cancelingRecordId ||
      cancelingPack
    ) {
      return;
    }

    const {
      isPackCut,
      isLoyaltyReward = false,
      countsForLoyalty = false,
      serviceName,
    } = options;

    const confirmMessage = isLoyaltyReward
      ? `Confirma o estorno deste corte gratuito de fidelidade (${serviceName})?\n\nO prêmio de 10/10 voltará a ficar disponível para o cliente e o resgate será removido dos relatórios.`
      : isPackCut
        ? `Confirma o cancelamento deste corte (${serviceName}) do pacote?\n\nO saldo de 1 corte será devolvido automaticamente ao pacote do cliente.`
        : countsForLoyalty
          ? `Confirma o cancelamento do atendimento "${serviceName}"?\n\nO atendimento será cancelado, desconsiderado nos relatórios e a contagem de fidelidade do cliente será recalculada.`
          : `Confirma o cancelamento do atendimento "${serviceName}"?\n\nO atendimento será cancelado e desconsiderado no histórico e relatórios.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setCancelingRecordId(recordId);
    setActionError(null);
    setActionFeedback(null);
    suppressInvalidationRef.current = true;
    try {
      const cancelResponse = await cancelServiceRecord(
        recordId,
        isLoyaltyReward
          ? "Estorno de cortesia fidelidade no detalhe do cliente"
          : isPackCut
            ? "Cancelado na fiscalização do cliente"
            : "Cancelado no histórico do cliente",
        currentClient.id,
      );
      suppressInvalidationRef.current = false;

      const { clientRefreshed } = await refreshAllAfterMutation(selectedPackId);
      if (
        !clientRefreshed &&
        cancelResponse &&
        typeof cancelResponse === "object" &&
        "loyaltySummary" in cancelResponse &&
        cancelResponse.loyaltySummary
      ) {
        const nextClient: Client = {
          ...currentClient,
          loyalty: cancelResponse.loyaltySummary,
        };
        setCurrentClient(nextClient);
        onClientUpdatedRef.current(nextClient);
      }

      setActionFeedback(
        isLoyaltyReward
          ? "Resgate de fidelidade estornado — corte gratuito disponível novamente (10/10)."
          : isPackCut
            ? "Corte cancelado e 1 crédito devolvido ao pacote."
            : "Atendimento cancelado com sucesso.",
      );
    } catch (cause: unknown) {
      setActionError(
        getApiErrorMessage(
          cause,
          "Não foi possível cancelar o atendimento selecionado.",
        ),
      );
    } finally {
      suppressInvalidationRef.current = false;
      setCancelingRecordId(null);
    }
  }

  async function handleCancelPack(pack: ClientPackDetail) {
    if (redeemingPackCut || cancelingRecordId || cancelingPack) {
      return;
    }

    const confirmed = window.confirm(
      `Confirma o cancelamento do pacote "${pack.planName}" de ${currentClient.name}?`,
    );
    if (!confirmed) return;

    setCancelingPack(true);
    setActionError(null);
    setActionFeedback(null);
    suppressInvalidationRef.current = true;
    try {
      await cancelClientPack(
        pack.id,
        "Cancelado pelo operador",
        currentClient.id,
      );
      suppressInvalidationRef.current = false;

      await refreshAllAfterMutation(pack.id);
      setActionFeedback("Pacote cancelado com sucesso.");
    } catch (cause: unknown) {
      setActionError(
        getApiErrorMessage(cause, "Não foi possível cancelar o pacote."),
      );
    } finally {
      suppressInvalidationRef.current = false;
      setCancelingPack(false);
    }
  }

  const activePack = currentClient.activePack;
  const loyalty = getClientLoyalty(currentClient);
  const hasActivePack =
    activePack?.status === "active" && activePack.remainingCuts > 0;
  const isExhaustedPack =
    activePack !== null &&
    !hasActivePack &&
    (activePack.status === "exhausted" ||
      activePack.needsRenewal === true ||
      activePack.remainingCuts <= 0);
  const activePackProgress =
    activePack && activePack.totalCuts > 0
      ? Math.min(
          100,
          Math.round((activePack.usedCuts / activePack.totalCuts) * 100),
        )
      : 0;
  const busyMutating =
    redeemingPackCut ||
    redeemingLoyaltyCut ||
    Boolean(cancelingRecordId) ||
    cancelingPack;

  return (
    <ModalOverlay
      disabled={busyMutating}
      maxWidthClass="max-w-[38rem]"
      onClose={onClose}
      sheetClassName="min-h-[82dvh] sm:min-h-[34rem]"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-4 pt-4 pb-3.5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <ClipboardCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
              Detalhes & Histórico
            </p>
            <h2 className="m-0 truncate text-lg font-bold text-[#17211b]">
              {currentClient.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#617067]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#34443a]">
                <Phone className="text-[#4a7957]" size={12} />
                {formatPhone(currentClient.phone)}
              </span>
              {currentClient.cpf && (
                <span>CPF: {formatCpf(currentClient.cpf)}</span>
              )}
            </div>
          </div>
        </div>

        <IconButton
          aria-label="Fechar"
          className="shrink-0"
          disabled={busyMutating}
          icon={<X size={18} />}
          onClick={onClose}
          type="button"
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {actionFeedback && (
          <div className="shrink-0 min-w-0">
            <FeedbackMessage
              message={actionFeedback}
              onClose={() => setActionFeedback(null)}
            />
          </div>
        )}

        {actionError && (
          <div className="shrink-0 min-w-0">
            <FeedbackMessage
              message={actionError}
              onClose={() => setActionError(null)}
              variant="error"
            />
          </div>
        )}

        <InlineMutationProgress
          active={busyMutating}
          className="shrink-0"
          label={
            redeemingPackCut
              ? "Registrando corte do pacote..."
              : redeemingLoyaltyCut
                ? "Resgatando corte fidelidade..."
                : cancelingPack
                  ? "Cancelando pacote..."
                  : "Cancelando registro..."
          }
        />

        <InlineMutationProgress
          active={!busyMutating && serviceLoading && !summary}
          className="shrink-0"
          label="Carregando resumo e histórico do cliente..."
        />

        {/* 1. Faixa de Resumo Rápido */}
        <div
          aria-label="Resumo rápido de atendimentos"
          className="grid shrink-0 min-w-0 grid-cols-2 gap-2 sm:grid-cols-5"
        >
          <div className="min-w-0 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
            <span className="block truncate text-[11px] font-bold tracking-[0.04em] text-[#617067] uppercase">
              Atendimentos
            </span>
            {serviceLoading && !summary ? (
              <span className="mt-1 block h-5 w-10 animate-pulse rounded bg-[#dce5dd]" />
            ) : (
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? summary.totalServicesCount : "—"}
              </strong>
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
            <span className="block truncate text-[11px] font-bold tracking-[0.04em] text-[#617067] uppercase">
              Avulsos
            </span>
            {serviceLoading && !summary ? (
              <span className="mt-1 block h-5 w-10 animate-pulse rounded bg-[#dce5dd]" />
            ) : (
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? summary.standaloneServicesCount : "—"}
              </strong>
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
            <span className="block truncate text-[11px] font-bold tracking-[0.04em] text-[#617067] uppercase">
              Via pacote
            </span>
            {serviceLoading && !summary ? (
              <span className="mt-1 block h-5 w-10 animate-pulse rounded bg-[#dce5dd]" />
            ) : (
              <strong className="text-base font-extrabold text-[#2f6840]">
                {summary ? summary.packServicesCount : "—"}
              </strong>
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
            <span className="block truncate text-[11px] font-bold tracking-[0.04em] text-[#617067] uppercase">
              Fidelidade
            </span>
            {serviceLoading && !summary ? (
              <span className="mt-1 block h-5 w-10 animate-pulse rounded bg-[#dce5dd]" />
            ) : (
              <strong className="text-base font-extrabold text-[#805d12]">
                {summary ? (summary.loyaltyServicesCount ?? 0) : "—"}
              </strong>
            )}
          </div>

          <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2 sm:col-span-1 sm:block">
            <span className="block text-[11px] font-bold tracking-[0.04em] text-[#617067] uppercase">
              Última visita
            </span>
            {serviceLoading && !summary ? (
              <span className="mt-1 block h-5 w-14 animate-pulse rounded bg-[#dce5dd]" />
            ) : (
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? formatDayMonthSaoPaulo(summary.lastServiceAt) : "—"}
              </strong>
            )}
          </div>
        </div>

        {/* Card de Programa de Fidelidade */}
        <div
          className={`grid shrink-0 min-w-0 gap-2.5 rounded-xl border p-3.5 ${
            loyalty.freeCutAvailable
              ? "border-[#ead9a6] bg-[#fff9e8]"
              : "border-[#dce5dd] bg-[#f5f7f4]"
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div
              className={`flex min-w-0 items-center gap-1.5 text-sm font-extrabold ${
                loyalty.freeCutAvailable ? "text-[#805d12]" : "text-[#23372a]"
              }`}
            >
              <Gift className="shrink-0" size={17} />
              <span>Programa de Fidelidade</span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
                loyalty.freeCutAvailable
                  ? "bg-[#805d12] text-white"
                  : "border border-[#dce5dd] bg-white text-[#2f6840]"
              }`}
            >
              {loyalty.currentCuts}/{loyalty.targetCuts} cortes
            </span>
          </div>

          <LoyaltyStampGrid
            loyalty={loyalty}
            showHeader={false}
            variant="detailed"
          />

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
            <span
              className={`font-bold ${
                loyalty.freeCutAvailable ? "text-[#805d12]" : "text-[#23372a]"
              }`}
            >
              {formatLoyaltyRemainingLabel(loyalty)}
            </span>
            <span className="font-medium text-[#617067]">
              Prêmios já resgatados:{" "}
              <strong className="text-[#17211b]">
                {loyalty.totalRewardsRedeemed}
              </strong>
            </span>
          </div>

          <p className="m-0 text-[11px] leading-snug text-[#617067]">
            Válido em Corte Masculino e Cabelo e Barba avulsos (não
            cumulativo).
          </p>

          {loyalty.freeCutAvailable && (
            <>
              {!redeemLoyaltyOpen && (
                <Button
                  className="!min-h-10 h-10 flex w-full items-center justify-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap sm:w-auto sm:justify-self-end"
                  disabled={busyMutating}
                  onClick={() => {
                    resetLoyaltyRedeemInputs();
                    setRedeemLoyaltyOpen(true);
                  }}
                  type="button"
                >
                  <Gift size={15} />
                  <span>Resgatar Corte Grátis</span>
                </Button>
              )}

              <AnimatePresence initial={false}>
                {redeemLoyaltyOpen && (
                  <m.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="shrink-0 overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="grid gap-3 rounded-xl border border-[#ead9a6] bg-white p-3">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#805d12]">
                        <span>Confirmar Corte Masculino Grátis (R$ 0,00)</span>
                      </div>

                      <LoyaltyRedeemFields
                        compact
                        disabled={busyMutating}
                        includeTip={loyaltyIncludeTip}
                        notes={loyaltyNotes}
                        onChangeNotes={setLoyaltyNotes}
                        onChangeTipCents={(cents) => {
                          setLoyaltyTipCents(cents);
                          setLoyaltyTipTouched(true);
                          if (actionError) setActionError(null);
                        }}
                        onChangeTipPaymentMethod={setLoyaltyTipPaymentMethod}
                        onToggleIncludeTip={handleToggleLoyaltyTip}
                        radioGroupName={`details-loyalty-tip-${currentClient.id}`}
                        tipCents={loyaltyTipCents}
                        tipInputRef={loyaltyTipInputRef}
                        tipPaymentMethod={loyaltyTipPaymentMethod}
                        tipTouched={loyaltyTipTouched}
                      />

                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <Button
                          className="!min-h-10 h-10 px-3 text-xs whitespace-nowrap"
                          disabled={busyMutating}
                          onClick={() => {
                            setRedeemLoyaltyOpen(false);
                            resetLoyaltyRedeemInputs();
                          }}
                          type="button"
                          variant="secondary"
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="!min-h-10 h-10 text-xs whitespace-nowrap"
                          disabled={busyMutating}
                          onClick={() => void handleConfirmLoyaltyRedeem()}
                          type="button"
                        >
                          {redeemingLoyaltyCut
                            ? "Resgatando..."
                            : "Confirmar Resgate Grátis"}
                        </Button>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* 2. Card de Pacote Ativo (quando aplicável) */}
        {hasActivePack && activePack && (
          <div className="grid shrink-0 min-w-0 gap-2.5 rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] p-3.5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#245c35]">
                <CheckCircle2 className="shrink-0" size={17} />
                <span className="truncate">{activePack.planName}</span>
              </div>
              <span className="shrink-0 rounded-full bg-[#2f6840] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
                {activePack.usedCuts}/{activePack.totalCuts} cortes
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-[#c9dfcd]">
              <div
                className="h-full rounded-full bg-[#2f6840] transition-all duration-300"
                style={{ width: `${activePackProgress}%` }}
              />
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-[#23372a]">
                Restam {activePack.remainingCuts}{" "}
                {activePack.remainingCuts === 1 ? "corte" : "cortes"} no saldo
              </span>
              <Button
                className="!min-h-10 h-10 flex w-full items-center justify-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap sm:w-auto"
                disabled={busyMutating}
                onClick={() => void handleQuickRedeemCut()}
                type="button"
              >
                <Scissors size={15} />
                <span>
                  {redeemingPackCut
                    ? "Descontando corte..."
                    : "Descontar 1 Corte"}
                </span>
              </Button>
            </div>
          </div>
        )}

        {isExhaustedPack && activePack && (
          <div className="grid shrink-0 min-w-0 gap-2.5 rounded-xl border border-[#ead9a6] bg-[#fff4d6] p-3.5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#805d12]">
                <AlertTriangle className="shrink-0" size={17} />
                <span className="truncate">{activePack.planName} · Esgotado</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#805d12] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
                {activePack.usedCuts}/{activePack.totalCuts} cortes
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#6e4f0e]">
                Todos os cortes deste pacote foram utilizados.
              </span>
              {onRequestRenew && (
                <Button
                  className="!min-h-10 h-10 flex w-full items-center justify-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap sm:w-auto"
                  disabled={busyMutating}
                  onClick={() => {
                    onClose();
                    onRequestRenew(currentClient);
                  }}
                  type="button"
                >
                  <PackagePlus size={15} />
                  <span>Renovar Pacote</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 3. Segmented Control / 2 Abas Compactas */}
        <div
          aria-label="Seções do histórico do cliente"
          className="grid shrink-0 min-w-0 grid-cols-2 gap-1 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-1"
          role="tablist"
        >
          {(
            [
              {
                id: "services",
                label: "Atendimentos",
                count: summary ? summary.totalServicesCount : null,
              },
              {
                id: "packs",
                label: "Pacotes",
                count: !packsLoading && !packsError ? packs.length : null,
              },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                aria-selected={selected}
                className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  selected
                    ? "bg-white text-[#2f6840] shadow-xs"
                    : "text-[#617067] hover:text-[#23372a]"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <span className="truncate">{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                      selected
                        ? "bg-[#e8f2ea] text-[#2f6840]"
                        : "bg-white/80 text-[#617067]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0 min-w-0">
          {activeTab === "services" ? (
            <ClientServiceHistoryTab
              cancelingRecordId={cancelingRecordId}
              disabledActions={busyMutating}
              error={serviceError}
              filterType={filterType}
              includeCanceled={includeCanceled}
              items={serviceItems}
              loadMoreError={serviceLoadMoreError}
              loading={serviceLoading}
              loadingMore={serviceLoadingMore}
              onCancelRecord={(item) =>
                void handleCancelRecord(item.id, {
                  isPackCut: item.isPackCut,
                  isLoyaltyReward: item.isLoyaltyReward,
                  countsForLoyalty: item.countsForLoyalty,
                  serviceName: item.serviceName,
                })
              }
              onDismissError={() => setServiceError(null)}
              onDismissLoadMoreError={() => setServiceLoadMoreError(null)}
              onFilterTypeChange={handleFilterTypeChange}
              onLoadMore={() => void handleLoadMoreRecords()}
              onRetry={handleRetryServiceRecords}
              onToggleIncludeCanceled={handleToggleIncludeCanceled}
              summary={summary}
              total={serviceTotal}
            />
          ) : (
            <ClientPacksTab
              cancelingCutId={cancelingRecordId}
              cancelingPack={cancelingPack}
              detailError={packDetailError}
              disabledActions={busyMutating}
              error={packsError}
              loading={packsLoading}
              loadingDetail={loadingPackDetail}
              onCancelConsumption={(consumptionId) =>
                void handleCancelRecord(consumptionId, {
                  isPackCut: true,
                  serviceName: "Corte Masculino",
                })
              }
              onCancelPack={(pack) => void handleCancelPack(pack)}
              onDismissDetailError={() => setPackDetailError(null)}
              onDismissError={() => setPacksError(null)}
              onRequestNewPack={
                onRequestRenew
                  ? () => {
                      onClose();
                      onRequestRenew(currentClient);
                    }
                  : undefined
              }
              onRetry={handleRetryPacks}
              onSelectPack={(packId) => void handleSelectPack(packId)}
              packs={packs}
              selectedPackDetail={selectedPackDetail}
              selectedPackId={selectedPackId}
            />
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-[#e8eee9] bg-[#f5f7f4] px-4 py-3 sm:px-5">
        <Button
          className="!min-h-10 h-10 px-4 py-2 text-sm whitespace-nowrap"
          disabled={busyMutating}
          onClick={onClose}
          type="button"
          variant="secondary"
        >
          Fechar
        </Button>
      </div>
    </ModalOverlay>
  );
}
