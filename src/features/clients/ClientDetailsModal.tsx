import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  Phone,
  Scissors,
  X,
} from "lucide-react";
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
} from "../../api/types";
import { useAuth } from "../../auth/authContext";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCpf,
  formatCurrency,
  formatDayMonthSaoPaulo,
  formatPhone,
} from "../../lib/formatters";
import { ClientPacksTab } from "./ClientPacksTab";
import { ClientServiceHistoryTab } from "./ClientServiceHistoryTab";

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

  useEffect(() => {
    onClientUpdatedRef.current = onClientUpdated;
  }, [onClientUpdated]);

  useEffect(() => {
    selectedPackIdRef.current = selectedPackId;
  }, [selectedPackId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !redeemingPackCut &&
        !cancelingRecordId &&
        !cancelingPack
      ) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, redeemingPackCut, cancelingRecordId, cancelingPack]);

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

  async function handleCancelRecord(
    recordId: string,
    isPackCut: boolean,
    serviceName: string,
  ) {
    if (redeemingPackCut || cancelingRecordId || cancelingPack) {
      return;
    }

    const confirmed = window.confirm(
      isPackCut
        ? `Confirma o cancelamento deste corte (${serviceName}) do pacote?\n\nO saldo de 1 corte será devolvido automaticamente ao pacote do cliente.`
        : `Confirma o cancelamento do atendimento "${serviceName}"?\n\nO atendimento será cancelado e desconsiderado no histórico e relatórios.`,
    );
    if (!confirmed) return;

    setCancelingRecordId(recordId);
    setActionError(null);
    setActionFeedback(null);
    suppressInvalidationRef.current = true;
    try {
      await cancelServiceRecord(
        recordId,
        isPackCut
          ? "Cancelado na fiscalização do cliente"
          : "Cancelado no histórico do cliente",
        currentClient.id,
      );
      suppressInvalidationRef.current = false;

      await refreshAllAfterMutation(selectedPackId);
      setActionFeedback(
        isPackCut
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
    redeemingPackCut || Boolean(cancelingRecordId) || cancelingPack;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="motion-content flex max-h-[92vh] w-full max-w-[38rem] flex-col overflow-hidden rounded-t-2xl border border-[#dce5dd] bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-5 pt-4 pb-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
              <ClipboardCheck size={20} />
            </div>
            <div className="min-w-0">
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
            disabled={busyMutating}
            icon={<X size={18} />}
            onClick={onClose}
            type="button"
          />
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
          {actionFeedback && (
            <FeedbackMessage
              message={actionFeedback}
              onClose={() => setActionFeedback(null)}
            />
          )}

          {actionError && (
            <FeedbackMessage
              message={actionError}
              onClose={() => setActionError(null)}
              variant="error"
            />
          )}

          {/* 1. Faixa de Resumo Rápido */}
          <div
            aria-label="Resumo rápido de atendimentos"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <div className="rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
              <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#617067]">
                Atendimentos
              </span>
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? summary.totalServicesCount : "—"}
              </strong>
            </div>

            <div className="rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
              <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#617067]">
                Avulsos
              </span>
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? summary.standaloneServicesCount : "—"}
              </strong>
            </div>

            <div className="rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
              <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#617067]">
                Via pacote
              </span>
              <strong className="text-base font-extrabold text-[#2f6840]">
                {summary ? summary.packServicesCount : "—"}
              </strong>
            </div>

            <div className="rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3 py-2">
              <span className="block text-[11px] font-bold uppercase tracking-[0.04em] text-[#617067]">
                Última visita
              </span>
              <strong className="text-base font-extrabold text-[#17211b]">
                {summary ? formatDayMonthSaoPaulo(summary.lastServiceAt) : "—"}
              </strong>
            </div>
          </div>

          {/* 2. Card de Pacote Ativo (quando aplicável) */}
          {hasActivePack && activePack && (
            <div className="grid gap-2.5 rounded-xl border border-[#9fc2a7] bg-[#e8f2ea] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#245c35]">
                  <CheckCircle2 className="shrink-0" size={17} />
                  <span className="truncate">{activePack.planName}</span>
                </div>
                <span className="shrink-0 rounded-full bg-[#2f6840] px-2.5 py-0.5 text-xs font-bold text-white">
                  {activePack.usedCuts}/{activePack.totalCuts} cortes
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#c9dfcd]">
                <div
                  className="h-full rounded-full bg-[#2f6840] transition-all duration-300"
                  style={{ width: `${activePackProgress}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-[#23372a]">
                  Restam {activePack.remainingCuts}{" "}
                  {activePack.remainingCuts === 1 ? "corte" : "cortes"} no saldo
                </span>
                <Button
                  className="!min-h-10 flex w-full items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:w-auto"
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
            <div className="grid gap-2.5 rounded-xl border border-[#ead9a6] bg-[#fff4d6] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#805d12]">
                  <AlertTriangle className="shrink-0" size={17} />
                  <span>{activePack.planName} · Esgotado</span>
                </span>
                <span className="rounded-full bg-[#805d12] px-2.5 py-0.5 text-xs font-bold text-white">
                  {activePack.usedCuts}/{activePack.totalCuts} cortes
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#6e4f0e]">
                  Todos os cortes deste pacote foram utilizados.
                </span>
                {onRequestRenew && (
                  <Button
                    className="!min-h-10 flex w-full items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:w-auto"
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
            className="grid grid-cols-2 gap-1 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-1"
            role="tablist"
          >
            <button
              aria-selected={activeTab === "services"}
              className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "services"
                  ? "bg-white text-[#2f6840] shadow-xs"
                  : "text-[#617067] hover:text-[#23372a]"
              }`}
              onClick={() => setActiveTab("services")}
              role="tab"
              type="button"
            >
              Atendimentos
              {summary ? ` (${summary.totalServicesCount})` : ""}
            </button>
            <button
              aria-selected={activeTab === "packs"}
              className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "packs"
                  ? "bg-white text-[#2f6840] shadow-xs"
                  : "text-[#617067] hover:text-[#23372a]"
              }`}
              onClick={() => setActiveTab("packs")}
              role="tab"
              type="button"
            >
              Pacotes
              {!packsLoading && !packsError ? ` (${packs.length})` : ""}
            </button>
          </div>

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
                void handleCancelRecord(
                  item.id,
                  item.isPackCut,
                  item.serviceName,
                )
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
                void handleCancelRecord(
                  consumptionId,
                  true,
                  "Corte Masculino",
                )
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

        <div className="flex shrink-0 justify-end border-t border-[#e8eee9] bg-[#f5f7f4] px-5 py-3">
          <Button
            disabled={busyMutating}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
