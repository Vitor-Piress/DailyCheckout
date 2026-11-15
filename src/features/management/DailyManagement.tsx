import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gift,
  Layers,
  PackageCheck,
  RotateCcw,
  Scissors,
  User,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { subscribeReportInvalidation } from "../../api/clientInvalidation";
import {
  cancelServiceRecord,
  closeDailySettlement,
  getDailyReport,
  listServiceRecords,
  listServiceTypes,
} from "../../api/dailyCheckoutApi";
import { ApiError } from "../../api/client";
import type { DailyReport, ServiceRecord, ServiceType } from "../../api/types";
import { ReportList } from "../../components/reports/ReportList";
import { UserReportGroups } from "../../components/reports/UserReportGroups";
import { Button } from "../../components/ui/Button";
import { ExpandablePanel } from "../../components/ui/ExpandablePanel";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { MetricCard } from "../../components/ui/MetricCard";
import { Panel } from "../../components/ui/Panel";
import { getApiErrorMessage } from "../../lib/errors";
import { useAuth } from "../../auth/authContext";
import { useManagementRefreshToken } from "./managementContext";
import {
  formatCurrency,
  formatIsoDate,
  getToday,
  paymentOptions,
  paymentMethodLabel,
} from "../../lib/formatters";

function formatDateForConfirmation(date: string): string {
  return formatIsoDate(date);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DailyManagement({
  refreshToken: propRefreshToken,
}: {
  refreshToken?: number;
}) {
  const outletRefreshToken = useManagementRefreshToken();
  const refreshToken = propRefreshToken ?? outletRefreshToken;
  const { role } = useAuth();
  const [date, setDate] = useState(getToday);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState<string | null>(
    null,
  );
  const [cancelingRecordId, setCancelingRecordId] = useState<string | null>(
    null,
  );
  const [recordActionMessage, setRecordActionMessage] = useState<string | null>(
    null,
  );
  const [recordActionError, setRecordActionError] = useState<string | null>(
    null,
  );
  const [summariesExpanded, setSummariesExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invalidationNonce, setInvalidationNonce] = useState(0);
  const suppressInvalidationRef = useRef(false);

  useEffect(() => {
    return subscribeReportInvalidation(() => {
      if (suppressInvalidationRef.current) return;
      setInvalidationNonce((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    void Promise.all([
      listServiceRecords(date),
      getDailyReport(date),
      listServiceTypes(),
    ])
      .then(([serviceRecords, dailyReport, availableServices]) => {
        setRecords(serviceRecords);
        setReport(dailyReport);
        setServiceTypes(availableServices);
      })
      .catch((cause: unknown) => {
        console.error(
          "Não foi possível carregar o acompanhamento diário:",
          cause,
        );
        setError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar os dados do dia.",
          ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [date, refreshToken, invalidationNonce, role]);

  function changeDate(value: string) {
    if (!value) {
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setRecords([]);
    setServiceTypes([]);
    setSettlementMessage(null);
    setDate(value);
  }

  function navigateDate(direction: -1 | 1) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + direction));
    changeDate(nextDate.toISOString().slice(0, 10));
  }

  const calculatedSettlement = report?.settlement;
  const displayedSettlement = calculatedSettlement
    ? {
        status:
          calculatedSettlement.persistenceStatus === "closed"
            ? ("closed" as const)
            : ("open" as const),
        closedAt: calculatedSettlement.closedSettlement?.closedAt ?? null,
        closedBy: calculatedSettlement.closedSettlement?.closedBy ?? null,
        admin:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.admin ??
              calculatedSettlement.admin)
            : calculatedSettlement.admin,
        dailyOperators:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.dailyOperators ??
              calculatedSettlement.dailyOperators)
            : calculatedSettlement.dailyOperators,
        grossServicesCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.grossServicesCents ??
              calculatedSettlement.grossServicesCents)
            : calculatedSettlement.grossServicesCents,
        tipsCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.tipsCents ??
              calculatedSettlement.tipsCents ??
              0)
            : (calculatedSettlement.tipsCents ?? 0),
        dailyOperatorsTipsCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.dailyOperatorsTipsCents ??
              calculatedSettlement.dailyOperatorsTipsCents ??
              0)
            : (calculatedSettlement.dailyOperatorsTipsCents ?? 0),
        dailyOperatorsTotalDueCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement
                ?.dailyOperatorsTotalDueCents ??
              calculatedSettlement.dailyOperatorsTotalDueCents)
            : calculatedSettlement.dailyOperatorsTotalDueCents,
        unidentifiedServicesCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement
                ?.unidentifiedServicesCents ??
              calculatedSettlement.unidentifiedServicesCents)
            : calculatedSettlement.unidentifiedServicesCents,
        unidentifiedServiceCount:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement
                ?.unidentifiedServiceCount ??
              calculatedSettlement.unidentifiedServiceCount)
            : calculatedSettlement.unidentifiedServiceCount,
        packSalesCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement?.packSalesCents ??
              calculatedSettlement.packSalesCents ??
              report.packSalesCents ??
              0)
            : (calculatedSettlement.packSalesCents ??
              report.packSalesCents ??
              0),
        packCommissionDeductionCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement
                ?.packCommissionDeductionCents ??
              calculatedSettlement.packCommissionDeductionCents ??
              0)
            : (calculatedSettlement.packCommissionDeductionCents ?? 0),
        loyaltyCommissionDeductionCents:
          calculatedSettlement.persistenceStatus === "closed"
            ? (calculatedSettlement.closedSettlement
                ?.loyaltyCommissionDeductionCents ??
              calculatedSettlement.loyaltyCommissionDeductionCents ??
              0)
            : (calculatedSettlement.loyaltyCommissionDeductionCents ?? 0),
        current: calculatedSettlement,
      }
    : null;
  const serviceSummaries = [
    ...serviceTypes.map((service) => {
      const summary = report?.services.find(
        (item) => item.serviceTypeId === service.id,
      );
      return {
        label: service.name,
        detail: `${summary?.quantity ?? 0} atendimento(s)`,
        value: formatCurrency(summary?.totalCents ?? 0),
      };
    }),
    ...(report?.services ?? [])
      .filter(
        (summary) =>
          !serviceTypes.some((service) => service.id === summary.serviceTypeId),
      )
      .map((summary) => ({
        label: summary.serviceName,
        detail: `${summary.quantity} atendimento(s)`,
        value: formatCurrency(summary.totalCents),
      })),
  ];
  const paymentSummaries = paymentOptions.map((option) => {
    const summary = report?.paymentMethods.find(
      (item) => item.paymentMethod === option.value,
    );
    const tipsCents = summary?.tipsCents ?? 0;
    const servicesCents =
      summary?.servicesCents ?? (summary?.totalCents ?? 0) - tipsCents;
    const countLabel = `${summary?.quantity ?? 0} pagamento(s)`;
    return {
      label: option.label,
      detail:
        tipsCents > 0
          ? `${countLabel} · Serviços: ${formatCurrency(servicesCents)} · Gorjetas: + ${formatCurrency(tipsCents)}`
          : countLabel,
      value: formatCurrency(summary?.totalCents ?? 0),
    };
  });
  const activeServicesCount = (report?.services ?? []).filter(
    (item) => item.quantity > 0,
  ).length;
  const activePaymentsCount = (report?.paymentMethods ?? []).filter(
    (item) => item.quantity > 0,
  ).length;

  async function handleCloseSettlement() {
    if (role !== "admin" || settlementSubmitting) {
      return;
    }

    const confirmed = window.confirm(
      `Confirma o fechamento do caixa de ${formatDateForConfirmation(date)}?\n\n` +
        "Após o fechamento, os valores serão registrados como um snapshot histórico " +
        "e não serão alterados automaticamente por mudanças posteriores nos atendimentos.",
    );
    if (!confirmed) {
      return;
    }

    setSettlementSubmitting(true);
    setSettlementMessage(null);
    try {
      await closeDailySettlement(date);
      setReport(await getDailyReport(date));
      setSettlementMessage("Caixa fechado com sucesso.");
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.status === 409) {
        try {
          setReport(await getDailyReport(date));
          setSettlementMessage(
            "Este caixa já foi fechado. Os dados foram atualizados.",
          );
        } catch (refreshCause: unknown) {
          setSettlementMessage(
            getApiErrorMessage(
              refreshCause,
              "O caixa já foi fechado, mas não foi possível atualizar os dados.",
            ),
          );
        }
      } else {
        setSettlementMessage(
          cause instanceof ApiError && cause.status === 403
            ? "Seu perfil não possui permissão para fechar o caixa."
            : getApiErrorMessage(cause, "Não foi possível fechar o caixa."),
        );
      }
    } finally {
      setSettlementSubmitting(false);
    }
  }

  async function handleCancelServiceRecord(record: ServiceRecord) {
    if (cancelingRecordId) return;

    const isPackCut = Boolean(record.clientPackId);
    const isLoyaltyReward = Boolean(record.isLoyaltyReward);
    const countsForLoyalty = Boolean(record.countsForLoyalty);
    const detailReason = isLoyaltyReward
      ? "Este atendimento foi um resgate gratuito da Fidelidade (10 cortes). Ao cancelar, o corte gratuito voltará a ficar disponível (10/10) para o cliente."
      : isPackCut
        ? "Este atendimento foi realizado pelo Pacote Mensal. Ao cancelar, 1 corte será devolvido automaticamente ao saldo do pacote do cliente."
        : countsForLoyalty
          ? "O atendimento será cancelado, desconsiderado nos relatórios e a contagem de fidelidade do cliente será recalculada."
          : "O atendimento será cancelado e desconsiderado nos relatórios.";

    const confirmed = window.confirm(
      `Confirma o cancelamento do atendimento "${record.serviceName || "Serviço"}"${
        record.clientName ? ` (${record.clientName})` : ""
      }?\n\n${detailReason}`,
    );
    if (!confirmed) return;

    setCancelingRecordId(record.id);
    setRecordActionError(null);
    setRecordActionMessage(null);
    suppressInvalidationRef.current = true;
    try {
      await cancelServiceRecord(
        record.id,
        "Cancelado na tela de gestão diária",
        record.clientId ?? undefined,
      );
      const [updatedRecords, updatedReport] = await Promise.all([
        listServiceRecords(date),
        getDailyReport(date),
      ]);
      setRecords(updatedRecords);
      setReport(updatedReport);
      setRecordActionMessage(
        isLoyaltyReward
          ? `Resgate de fidelidade cancelado e prêmio devolvido${record.clientName ? ` para ${record.clientName}` : ""}.`
          : isPackCut
            ? `Atendimento cancelado e 1 corte devolvido ao pacote${record.clientName ? ` de ${record.clientName}` : ""}.`
            : "Atendimento cancelado com sucesso.",
      );
    } catch (cause: unknown) {
      setRecordActionError(
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

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-1.5 rounded-xl border border-[#dce5dd] bg-white p-4">
        <label
          className="text-sm font-bold text-[#34443a]"
          htmlFor="report-date"
        >
          Data do acompanhamento
        </label>
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            aria-label="Dia anterior"
            className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[0.55rem] border border-[#c8d6ca] bg-[#f5f7f4] px-3 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2"
            onClick={() => navigateDate(-1)}
            title="Dia anterior"
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <input
            className="h-11 min-w-0 flex-1 rounded-[0.55rem] border border-[#c8d6ca] px-3 py-2 text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
            id="report-date"
            max={getToday()}
            onChange={(event) => changeDate(event.target.value)}
            type="date"
            value={date}
          />
          <button
            aria-label="Próximo dia"
            className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[0.55rem] border border-[#c8d6ca] bg-[#f5f7f4] px-3 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={date >= getToday()}
            onClick={() => navigateDate(1)}
            title="Próximo dia"
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div>
      {loading && <LoadingMessage>Carregando dados do dia...</LoadingMessage>}
      {error && (
        <FeedbackMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}
      {!loading && !error && report && (
        <>
          {role === "daily_operator" && report.operatorShare ? (
            <Panel className="motion-content grid gap-4" key={date}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                    Meus ganhos no dia
                  </p>
                  <h2 className="m-0 text-base leading-tight">
                    Divisão de atendimentos (
                    {report.operatorShare.sharePercentage}% /{" "}
                    {100 - report.operatorShare.sharePercentage}%)
                  </h2>
                </div>
                <span className="rounded-full bg-[#e8f2ea] px-3 py-1 text-xs font-bold text-[#2f6840]">
                  {report.operatorShare.serviceCount}{" "}
                  {report.operatorShare.serviceCount === 1
                    ? "atendimento"
                    : "atendimentos"}
                </span>
              </div>
              <div className="grid gap-3 rounded-[0.9rem] bg-[#2f6840] p-4 text-white sm:flex sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#d7eadb]">
                    {(report.operatorShare.tipsCents ?? 0) > 0
                      ? `Minha parte (${report.operatorShare.sharePercentage}% serviços + 100% gorjetas)`
                      : `Minha parte (${report.operatorShare.sharePercentage}%)`}
                  </span>
                  <strong className="text-2xl sm:text-3xl">
                    {formatCurrency(report.operatorShare.operatorShareCents)}
                  </strong>
                </div>
                <span className="w-fit rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-[#e8f2ea]">
                  Ganho líquido do operador
                </span>
              </div>
              <div
                className={`grid gap-3 ${
                  (report.operatorShare.tipsCents ?? 0) > 0
                    ? "sm:grid-cols-3"
                    : "sm:grid-cols-2"
                }`}
              >
                <div className="grid gap-1 rounded-[0.8rem] border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                  <span className="text-xs font-bold text-[#617067]">
                    Valor bruto dos serviços
                  </span>
                  <strong className="text-lg text-[#23372a]">
                    {formatCurrency(report.operatorShare.grossServicesCents)}
                  </strong>
                </div>
                {(report.operatorShare.tipsCents ?? 0) > 0 && (
                  <>
                    <div className="grid gap-1 rounded-[0.8rem] border border-[#dce5dd] bg-[#e8f2ea] p-3.5">
                      <span className="text-xs font-bold text-[#4a7957]">
                        Gorjetas (100% operador)
                      </span>
                      <strong className="text-lg text-[#2f6840]">
                        + {formatCurrency(report.operatorShare.tipsCents)}
                      </strong>
                    </div>
                    <div className="grid gap-1 rounded-[0.8rem] border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                      <span className="text-xs font-bold text-[#617067]">
                        Total bruto movimentado
                      </span>
                      <strong className="text-lg text-[#23372a]">
                        {formatCurrency(
                          report.operatorShare.grossRevenueCents ??
                            report.operatorShare.grossServicesCents +
                              report.operatorShare.tipsCents,
                        )}
                      </strong>
                    </div>
                  </>
                )}
              </div>
              {Boolean((report.operatorShare.packCutsCount ?? 0) > 0) && (
                <div className="grid gap-1 rounded-[0.8rem] border border-[#9fc2a7] bg-[#e8f2ea] p-3.5 text-xs text-[#2f6840]">
                  <span className="font-bold">
                    Cortes de Pacote: {report.operatorShare.packCutsCount}{" "}
                    {report.operatorShare.packCutsCount === 1
                      ? "corte"
                      : "cortes"}
                  </span>
                  <span>
                    Valor de referência:{" "}
                    {formatCurrency(
                      report.operatorShare.packCutsReferenceCents ?? 0,
                    )}{" "}
                    · Comissão operador (50%):{" "}
                    <strong>
                      {formatCurrency(
                        report.operatorShare.packCommissionCents ?? 0,
                      )}
                    </strong>
                  </span>
                </div>
              )}
              {Boolean((report.operatorShare.loyaltyCutsCount ?? 0) > 0) && (
                <div className="grid gap-1 rounded-[0.8rem] border border-[#ead9a6] bg-[#fff9e8] p-3.5 text-xs text-[#805d12]">
                  <span className="font-bold">
                    Cortes Fidelidade (Grátis):{" "}
                    {report.operatorShare.loyaltyCutsCount}{" "}
                    {report.operatorShare.loyaltyCutsCount === 1
                      ? "corte"
                      : "cortes"}
                  </span>
                  <span>
                    Valor de referência:{" "}
                    {formatCurrency(
                      report.operatorShare.loyaltyCutsReferenceCents ?? 0,
                    )}{" "}
                    · Comissão operador (50%):{" "}
                    <strong>
                      {formatCurrency(
                        report.operatorShare.loyaltyCommissionCents ?? 0,
                      )}
                    </strong>
                  </span>
                </div>
              )}
            </Panel>
          ) : (
            <div
              className="motion-content grid gap-4 sm:grid-cols-2"
              key={date}
            >
              <MetricCard
                detail={
                  (report.loyaltyCutsCount ?? 0) > 0
                    ? `Inclui ${report.loyaltyCutsCount} ${report.loyaltyCutsCount === 1 ? "corte grátis" : "cortes grátis"} (fidelidade)`
                    : undefined
                }
                label="Atendimentos"
                value={report.serviceCount}
              />
              <MetricCard
                detail={
                  (report.tipsCents ?? 0) > 0 ||
                  (report.packSalesCents ?? 0) > 0
                    ? [
                        (report.packSalesCents ?? 0) > 0
                          ? `Pacotes: ${formatCurrency(report.packSalesCents ?? 0)} (${report.packSalesCount ?? 0} vend.)`
                          : null,
                        (report.tipsCents ?? 0) > 0
                          ? `Gorjetas: + ${formatCurrency(report.tipsCents)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
                label="Receita bruta"
                value={formatCurrency(report.grossRevenueCents)}
              />
            </div>
          )}
          {role === "admin" && (
            <Panel>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                    Apuração financeira
                  </p>
                  <h2 className="m-0 text-base leading-tight">
                    Fechamento do dia
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    displayedSettlement?.status === "closed"
                      ? "bg-[#e8f2ea] text-[#2f6840]"
                      : "bg-[#fff4d6] text-[#805d12]"
                  }`}
                >
                  {displayedSettlement?.status === "closed"
                    ? "Caixa fechado"
                    : "Caixa aberto"}
                </span>
              </div>
              {loading ? (
                <LoadingMessage>
                  Carregando fechamento do caixa...
                </LoadingMessage>
              ) : displayedSettlement ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                      detail={
                        (displayedSettlement.admin.tipsCents ?? 0) > 0
                          ? `+ ${formatCurrency(displayedSettlement.admin.tipsCents)} em gorjetas próprias`
                          : undefined
                      }
                      label="Atendimentos próprios do administrador"
                      value={formatCurrency(
                        displayedSettlement.admin.ownServicesCents,
                      )}
                    />
                    <MetricCard
                      detail={
                        displayedSettlement.dailyOperatorsTipsCents > 0
                          ? "50% sobre serviços (sem gorjetas)"
                          : undefined
                      }
                      label="Participação dos operadores"
                      value={formatCurrency(
                        displayedSettlement.admin.dailyOperatorsShareCents,
                      )}
                    />
                    <MetricCard
                      detail={
                        displayedSettlement.admin.totalDueCents < 0
                          ? "Saldo a cobrir (repasse aos operadores)"
                          : (displayedSettlement.admin.tipsCents ?? 0) > 0
                            ? `Inclui ${formatCurrency(displayedSettlement.admin.tipsCents)} de gorjetas`
                            : undefined
                      }
                      label="Total líquido ao administrador"
                      value={formatCurrency(
                        displayedSettlement.admin.totalDueCents,
                      )}
                    />
                    <MetricCard
                      detail={
                        displayedSettlement.dailyOperatorsTipsCents > 0
                          ? `Inclui ${formatCurrency(displayedSettlement.dailyOperatorsTipsCents)} de gorjetas`
                          : undefined
                      }
                      label="Total líquido aos operadores"
                      value={formatCurrency(
                        displayedSettlement.dailyOperatorsTotalDueCents,
                      )}
                    />
                  </div>
                  {(() => {
                    const packSalesCents =
                      displayedSettlement.packSalesCents ??
                      report?.packSalesCents ??
                      0;
                    const packCommissionDeductionCents =
                      displayedSettlement.packCommissionDeductionCents ?? 0;
                    const loyaltyCommissionDeductionCents =
                      displayedSettlement.loyaltyCommissionDeductionCents ?? 0;

                    if (
                      packSalesCents <= 0 &&
                      packCommissionDeductionCents <= 0 &&
                      loyaltyCommissionDeductionCents <= 0
                    ) {
                      return null;
                    }

                    return (
                      <div className="mt-3 grid gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3 text-xs">
                        {packSalesCents > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[#2f6840]">
                            <span className="font-medium">
                              Pacotes vendidos hoje:
                            </span>
                            <strong className="text-sm">
                              {formatCurrency(packSalesCents)}
                            </strong>
                          </div>
                        )}
                        {packCommissionDeductionCents > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#f2c2bb] bg-[#fff1ef] p-2 text-[#8b3d32]">
                            <span className="font-bold">
                              Repasse de cortes de pacote (operadores):
                            </span>
                            <strong className="text-sm font-extrabold">
                              - {formatCurrency(packCommissionDeductionCents)}
                            </strong>
                          </div>
                        )}
                        {loyaltyCommissionDeductionCents > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#f2c2bb] bg-[#fff1ef] p-2 text-[#8b3d32]">
                            <span className="font-bold">
                              Comissão Fidelidade (operadores):
                            </span>
                            <strong className="text-sm font-extrabold">
                              -{" "}
                              {formatCurrency(loyaltyCommissionDeductionCents)}
                            </strong>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(displayedSettlement.tipsCents > 0 ||
                    (displayedSettlement.admin.tipsCents ?? 0) > 0 ||
                    displayedSettlement.dailyOperatorsTipsCents > 0) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3.5 py-2.5 text-xs text-[#34443a]">
                      <span>
                        Serviços no fechamento:{" "}
                        <strong>
                          {formatCurrency(
                            displayedSettlement.grossServicesCents,
                          )}
                        </strong>
                      </span>
                      <span>
                        Gorjetas no fechamento:{" "}
                        <strong className="text-[#2f6840]">
                          +{" "}
                          {formatCurrency(
                            displayedSettlement.tipsCents ||
                              (displayedSettlement.admin.tipsCents ?? 0) +
                                displayedSettlement.dailyOperatorsTipsCents,
                          )}
                        </strong>{" "}
                        <span className="text-[#617067]">
                          (Admin:{" "}
                          {formatCurrency(
                            displayedSettlement.admin.tipsCents ?? 0,
                          )}{" "}
                          · Operadores:{" "}
                          {formatCurrency(
                            displayedSettlement.dailyOperatorsTipsCents,
                          )}
                          )
                        </span>
                      </span>
                    </div>
                  )}
                  {displayedSettlement.status === "closed" &&
                    displayedSettlement.closedAt && (
                      <p className="mt-4 mb-0 text-sm text-[#617067]">
                        Fechado em{" "}
                        {formatDateTime(displayedSettlement.closedAt)}
                        {displayedSettlement.closedBy
                          ? ` por ${displayedSettlement.closedBy.userName}`
                          : ""}
                        .
                      </p>
                    )}
                  {displayedSettlement.unidentifiedServiceCount > 0 && (
                    <div className="mt-4 rounded-xl border border-[#ead9a6] bg-[#fff9e8] p-3 text-sm text-[#805d12]">
                      <strong>Atendimentos sem autor identificado</strong>
                      <p className="m-0 mt-1">
                        {displayedSettlement.unidentifiedServiceCount}{" "}
                        {displayedSettlement.unidentifiedServiceCount === 1
                          ? "atendimento"
                          : "atendimentos"}{" "}
                        —{" "}
                        {formatCurrency(
                          displayedSettlement.unidentifiedServicesCents,
                        )}
                      </p>
                    </div>
                  )}
                  {displayedSettlement.current
                    ?.hasDifferenceFromCurrentCalculation && (
                    <div className="mt-4 rounded-xl border border-[#e7b0a7] bg-[#fff1ef] p-3 text-sm text-[#8b3d32]">
                      <strong>
                        Atenção: os atendimentos atuais são diferentes do
                        fechamento registrado.
                      </strong>
                      <p className="m-0 mt-1">
                        O snapshot histórico continua sendo o valor oficial do
                        fechamento. Diferença atual para o admin:{" "}
                        {formatCurrency(
                          displayedSettlement.current.differences
                            ?.adminTotalDueCents ?? 0,
                        )}
                        ; operadores:{" "}
                        {formatCurrency(
                          displayedSettlement.current.differences
                            ?.dailyOperatorsTotalDueCents ?? 0,
                        )}
                        .
                      </p>
                    </div>
                  )}
                  {displayedSettlement.dailyOperators.length > 0 && (
                    <div className="mt-5 grid gap-3">
                      <h3 className="m-0 text-sm font-bold text-[#34443a]">
                        Fechamento por operador
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {displayedSettlement.dailyOperators.map((operator) => {
                          const operatorTipsCents = operator.tipsCents ?? 0;
                          return (
                            <div
                              className="grid gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5"
                              key={operator.userId}
                            >
                              <strong className="text-[#23372a]">
                                {operator.userName}
                              </strong>
                              <span className="text-sm text-[#617067]">
                                Atendimentos: {operator.serviceCount}
                              </span>
                              <span className="text-sm text-[#617067]">
                                {operatorTipsCents > 0
                                  ? "Serviços (bruto)"
                                  : "Valor bruto"}
                                : {formatCurrency(operator.grossServicesCents)}
                              </span>
                              {operatorTipsCents > 0 && (
                                <span className="text-sm font-medium text-[#2f6840]">
                                  Gorjetas (100% operador): +{" "}
                                  {formatCurrency(operatorTipsCents)}
                                </span>
                              )}
                              {Boolean(
                                (operator.packCommissionCents ?? 0) > 0,
                              ) && (
                                <span className="font-semibold text-sm text-[#2f6840]">
                                  Comissão cortes de pacote: +{" "}
                                  {formatCurrency(
                                    operator.packCommissionCents ?? 0,
                                  )}
                                  {operator.packCutsCount
                                    ? ` (${operator.packCutsCount} corte${operator.packCutsCount === 1 ? "" : "s"})`
                                    : ""}
                                </span>
                              )}
                              {Boolean(
                                (operator.loyaltyCommissionCents ?? 0) > 0,
                              ) && (
                                <span className="font-semibold text-sm text-[#805d12]">
                                  Comissão Fidelidade: +{" "}
                                  {formatCurrency(
                                    operator.loyaltyCommissionCents ?? 0,
                                  )}
                                  {operator.loyaltyCutsCount
                                    ? ` (${operator.loyaltyCutsCount} corte${operator.loyaltyCutsCount === 1 ? "" : "s"})`
                                    : ""}
                                </span>
                              )}
                              <span className="text-sm text-[#617067]">
                                Parte do operador:{" "}
                                {formatCurrency(operator.operatorShareCents)}
                              </span>
                              <span className="text-sm text-[#617067]">
                                Parte do administrador:{" "}
                                {formatCurrency(operator.adminShareCents)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {settlementMessage && (
                    <div className="mt-3">
                      <FeedbackMessage
                        message={settlementMessage}
                        onClose={() => setSettlementMessage(null)}
                      />
                    </div>
                  )}
                  {displayedSettlement.status === "open" && (
                    <button
                      className="mt-5 min-h-11 rounded-[0.55rem] bg-[#2f6840] px-4 py-2 font-bold text-white transition hover:bg-[#245432] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={settlementSubmitting}
                      onClick={() => void handleCloseSettlement()}
                      type="button"
                    >
                      {settlementSubmitting
                        ? "Fechando caixa..."
                        : "Fechar caixa do dia"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {settlementMessage ? (
                    <FeedbackMessage
                      message={settlementMessage}
                      onClose={() => setSettlementMessage(null)}
                      variant="error"
                    />
                  ) : (
                    <p className="m-0 text-[#617067]">
                      Não foi possível obter a apuração financeira deste dia.
                    </p>
                  )}
                </>
              )}
            </Panel>
          )}
          {role === "admin" && <UserReportGroups users={report.users ?? []} />}
          <ExpandablePanel
            badge={
              <span className="inline-flex items-center rounded-full border border-[#dce5dd] bg-[#f5f7f4] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                {activeServicesCount > 0 || activePaymentsCount > 0
                  ? `${activeServicesCount} serv. · ${activePaymentsCount} pgto.`
                  : "Sem movimentos"}
              </span>
            }
            bodyClassName="grid min-w-0 gap-3.5 border-t border-[#e8eee9] p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"
            expanded={summariesExpanded}
            eyebrow="Detalhamento do dia"
            icon={<Layers aria-hidden="true" size={20} />}
            id="daily-summaries-panel"
            onToggle={() => setSummariesExpanded((expanded) => !expanded)}
            title="Serviços e pagamentos"
          >
            <ReportList
              emptyMessage="Nenhum serviço cadastrado."
              icon={<Scissors aria-hidden="true" size={15} />}
              items={serviceSummaries}
              title="Resumo por serviço"
              variant="inset"
            />
            <ReportList
              emptyMessage="Nenhuma forma de pagamento cadastrada."
              icon={<Wallet aria-hidden="true" size={15} />}
              items={paymentSummaries}
              title="Resumo por pagamento"
              variant="inset"
            />
          </ExpandablePanel>
          <ExpandablePanel
            badge={
              <span className="inline-flex items-center rounded-full border border-[#dce5dd] bg-[#f5f7f4] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                {records.length}{" "}
                {records.length === 1 ? "registro" : "registros"}
              </span>
            }
            expanded={recordsExpanded}
            eyebrow="Atendimentos realizados"
            icon={<ClipboardList aria-hidden="true" size={20} />}
            id="daily-records-list"
            onToggle={() => setRecordsExpanded((expanded) => !expanded)}
            title="Registros do dia"
          >
            {recordActionMessage && (
              <FeedbackMessage
                message={recordActionMessage}
                onClose={() => setRecordActionMessage(null)}
              />
            )}

            {recordActionError && (
              <FeedbackMessage
                message={recordActionError}
                onClose={() => setRecordActionError(null)}
                variant="error"
              />
            )}

            {records.length === 0 ? (
              <p className="m-0 text-sm text-[#617067]">
                Nenhum atendimento nesta data.
              </p>
            ) : (
              <ul className="m-0 grid min-w-0 list-none gap-2.5 p-0">
                        {records.map((record) => {
                          const isPackCut = Boolean(record.clientPackId);
                          const isLoyaltyReward = Boolean(
                            record.isLoyaltyReward,
                          );
                          const tipCents = record.tipCents ?? 0;
                          const totalCents =
                            record.totalCents ?? record.priceCents + tipCents;
                          const tipWithDifferentMethod =
                            tipCents > 0 &&
                            record.tipPaymentMethod &&
                            (isPackCut ||
                              isLoyaltyReward ||
                              record.tipPaymentMethod !== record.paymentMethod)
                              ? record.tipPaymentMethod
                              : null;
                          const isCanceling = cancelingRecordId === record.id;

                          return (
                            <li
                              className="grid min-w-0 gap-2.5 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5 text-[#34443a]"
                              key={record.id}
                            >
                              <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                  <strong className="text-sm leading-snug text-[#17211b] sm:text-base">
                                    {record.serviceName || "Serviço"}
                                  </strong>
                                  {record.clientName && (
                                    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#c8d6ca] bg-white px-2 py-0.5 text-xs font-bold text-[#23372a]">
                                      <User
                                        className="shrink-0 text-[#4a7957]"
                                        size={12}
                                      />
                                      <span className="truncate">
                                        {record.clientName}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <Button
                                  aria-label={`Cancelar atendimento ${record.serviceName || "Serviço"}`}
                                  className="!min-h-8 h-8 flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs whitespace-nowrap"
                                  disabled={Boolean(cancelingRecordId)}
                                  onClick={() =>
                                    void handleCancelServiceRecord(record)
                                  }
                                  title="Cancelar atendimento"
                                  type="button"
                                  variant="danger"
                                >
                                  <RotateCcw size={13} />
                                  <span>
                                    {isCanceling ? "Cancelando..." : "Cancelar"}
                                  </span>
                                </Button>
                              </div>

                              {(isPackCut ||
                                isLoyaltyReward ||
                                record.countsForLoyalty ||
                                tipCents > 0) && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isLoyaltyReward && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-[#ead9a6] bg-[#fff4d6] px-2 py-0.5 text-xs font-bold text-[#805d12]">
                                      <Gift className="shrink-0" size={12} />
                                      <span>Fidelidade · Corte Grátis</span>
                                    </span>
                                  )}
                                  {isPackCut && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-[#9fc2a7] bg-[#e8f2ea] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                                      <PackageCheck size={12} />
                                      <span>Corte de Pacote</span>
                                    </span>
                                  )}
                                  {!isPackCut &&
                                    !isLoyaltyReward &&
                                    record.countsForLoyalty && (
                                      <span className="inline-flex items-center rounded-md border border-[#c8d6ca] bg-white px-2 py-0.5 text-[11px] font-bold text-[#2f6840]">
                                        +1 fidelidade
                                      </span>
                                    )}
                                  {tipCents > 0 && (
                                    <span className="inline-flex items-center rounded-md border border-[#cfe0d3] bg-white px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                                      + {formatCurrency(tipCents)} gorjeta
                                      {tipWithDifferentMethod
                                        ? ` (${paymentMethodLabel(tipWithDifferentMethod)})`
                                        : ""}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="grid gap-0.5">
                                <small className="text-xs text-[#617067]">
                                  {isLoyaltyReward
                                    ? tipCents > 0
                                      ? `Gorjeta em ${paymentMethodLabel(record.tipPaymentMethod ?? record.paymentMethod)}`
                                      : "Cortesia Fidelidade (R$ 0,00)"
                                    : paymentMethodLabel(record.paymentMethod)}
                                  {record.createdBy
                                    ? ` · Lançado por: ${record.createdBy.name}`
                                    : ""}
                                  {record.occurredAt
                                    ? ` · ${formatDateTime(record.occurredAt)}`
                                    : ""}
                                </small>
                                {record.notes && (
                                  <small className="text-xs text-[#617067]">
                                    Obs.: {record.notes}
                                  </small>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2ebe4] pt-2 text-xs">
                                {isLoyaltyReward ? (
                                  role === "admin" ? (
                                    <>
                                      <span className="inline-flex items-center rounded-md bg-[#fff4d6] px-2 py-0.5 font-semibold text-[#805d12]">
                                        Cortesia de 10 cortes (sem entrada no
                                        caixa)
                                      </span>
                                      {record.operatorShareCents > 0 ? (
                                        <strong className="font-bold text-[#805d12]">
                                          Repasse operador:{" "}
                                          {formatCurrency(
                                            record.operatorShareCents,
                                          )}{" "}
                                          <span className="font-medium text-[#617067]">
                                            · Admin:{" "}
                                            {formatCurrency(
                                              record.adminShareCents,
                                            )}
                                          </span>
                                        </strong>
                                      ) : tipCents > 0 ? (
                                        <strong className="font-bold text-[#2f6840]">
                                          Gorjeta admin: +{" "}
                                          {formatCurrency(tipCents)}
                                        </strong>
                                      ) : (
                                        <span className="font-semibold text-[#617067]">
                                          Admin:{" "}
                                          {formatCurrency(
                                            record.adminShareCents,
                                          )}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[#617067]">
                                        Cortesia 10/10 (Ref.:{" "}
                                        {formatCurrency(record.priceCents)}
                                        {tipCents > 0
                                          ? ` · inclui ${formatCurrency(tipCents)} gorjeta`
                                          : ""}
                                        )
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f2ea] px-2 py-0.5 font-bold text-[#2f6840]">
                                        Sua parte:{" "}
                                        <strong className="text-sm">
                                          {formatCurrency(
                                            record.operatorShareCents,
                                          )}
                                        </strong>
                                      </span>
                                    </>
                                  )
                                ) : isPackCut ? (
                                  role === "admin" ? (
                                    <>
                                      <span className="inline-flex items-center rounded-md bg-[#e8f2ea] px-2 py-0.5 font-semibold text-[#2f6840]">
                                        Valor já recebido na compra do pacote
                                      </span>
                                      {record.operatorShareCents > 0 ? (
                                        <strong className="font-bold text-[#805d12]">
                                          Repasse operador:{" "}
                                          {formatCurrency(
                                            record.operatorShareCents,
                                          )}
                                        </strong>
                                      ) : (
                                        tipCents > 0 && (
                                          <strong className="font-bold text-[#2f6840]">
                                            Gorjeta admin: +{" "}
                                            {formatCurrency(tipCents)}
                                          </strong>
                                        )
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[#617067]">
                                        Ref.:{" "}
                                        {formatCurrency(record.priceCents)}
                                        {tipCents > 0
                                          ? ` (inclui ${formatCurrency(tipCents)} gorjeta)`
                                          : ""}
                                      </span>
                                      <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f2ea] px-2 py-0.5 font-bold text-[#2f6840]">
                                        Sua parte:{" "}
                                        <strong className="text-sm">
                                          {formatCurrency(
                                            record.operatorShareCents,
                                          )}
                                        </strong>
                                      </span>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <span className="text-[#617067]">
                                      {tipCents > 0
                                        ? `Serviço: ${formatCurrency(record.priceCents)} · Total: ${formatCurrency(totalCents)}`
                                        : `Valor bruto: ${formatCurrency(record.priceCents)}`}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f2ea] px-2 py-0.5 font-bold text-[#2f6840]">
                                      {role === "admin"
                                        ? "Total:"
                                        : tipCents > 0
                                          ? "Minha parte:"
                                          : "Minha parte (50%):"}{" "}
                                      <strong className="text-sm">
                                        {formatCurrency(
                                          role === "admin"
                                            ? totalCents
                                            : record.operatorShareCents,
                                        )}
                                      </strong>
                                    </span>
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
            )}
          </ExpandablePanel>
        </>
      )}
    </div>
  );
}
