import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import {
  closeDailySettlement,
  getDailyReport,
  listServiceRecords,
  listServiceTypes,
} from "../../api/dailyCheckoutApi";
import { ApiError } from "../../api/client";
import type { DailyReport, ServiceRecord, ServiceType } from "../../api/types";
import { ReportList } from "../../components/reports/ReportList";
import { UserReportGroups } from "../../components/reports/UserReportGroups";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { MetricCard } from "../../components/ui/MetricCard";
import { Panel } from "../../components/ui/Panel";
import { getApiErrorMessage } from "../../lib/errors";
import { useAuth } from "../../auth/authContext";
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

export function DailyManagement({ refreshToken }: { refreshToken: number }) {
  const { role } = useAuth();
  const [date, setDate] = useState(getToday);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      role === "admin" ? Promise.resolve([]) : listServiceRecords(date),
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
  }, [date, refreshToken, role]);

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
    return {
      label: option.label,
      detail: `${summary?.quantity ?? 0} pagamento(s)`,
      value: formatCurrency(summary?.totalCents ?? 0),
    };
  });

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

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5 rounded-xl border border-[#dce5dd] bg-white p-4">
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
                    Minha parte ({report.operatorShare.sharePercentage}%)
                  </span>
                  <strong className="text-2xl sm:text-3xl">
                    {formatCurrency(report.operatorShare.operatorShareCents)}
                  </strong>
                </div>
                <span className="w-fit rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-[#e8f2ea]">
                  Ganho líquido do operador
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 rounded-[0.8rem] border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                  <span className="text-xs font-bold text-[#617067]">
                    Valor bruto dos serviços
                  </span>
                  <strong className="text-lg text-[#23372a]">
                    {formatCurrency(report.operatorShare.grossServicesCents)}
                  </strong>
                </div>
              </div>
            </Panel>
          ) : (
            <div
              className="motion-content grid gap-4 sm:grid-cols-2"
              key={date}
            >
              <MetricCard label="Atendimentos" value={report.serviceCount} />
              <MetricCard
                label="Receita bruta"
                value={formatCurrency(report.grossRevenueCents)}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <ReportList
              emptyMessage="Nenhum serviço cadastrado."
              items={serviceSummaries}
              title="Resumo por serviço"
            />
            <ReportList
              emptyMessage="Nenhuma forma de pagamento cadastrada."
              items={paymentSummaries}
              title="Resumo por pagamento"
            />
          </div>
          {role === "admin" && <UserReportGroups users={report.users ?? []} />}
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
                      label="Atendimentos próprios do administrador"
                      value={formatCurrency(
                        displayedSettlement.admin.ownServicesCents,
                      )}
                    />
                    <MetricCard
                      label="Participação dos operadores"
                      value={formatCurrency(
                        displayedSettlement.admin.dailyOperatorsShareCents,
                      )}
                    />
                    <MetricCard
                      label="Total líquido ao administrador"
                      value={formatCurrency(
                        displayedSettlement.admin.totalDueCents,
                      )}
                    />
                    <MetricCard
                      label="Total líquido aos operadores"
                      value={formatCurrency(
                        displayedSettlement.dailyOperatorsTotalDueCents,
                      )}
                    />
                  </div>
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
                        {displayedSettlement.dailyOperators.map((operator) => (
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
                              Valor bruto:{" "}
                              {formatCurrency(operator.grossServicesCents)}
                            </span>
                            <span className="text-sm text-[#617067]">
                              Parte do operador:{" "}
                              {formatCurrency(operator.operatorShareCents)}
                            </span>
                            <span className="text-sm text-[#617067]">
                              Parte do administrador:{" "}
                              {formatCurrency(operator.adminShareCents)}
                            </span>
                          </div>
                        ))}
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
          {role !== "admin" && (
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                    Atendimentos realizados
                  </p>
                  <h2 className="m-0 text-base leading-tight">
                    Registros do dia
                  </h2>
                </div>
                <ClipboardList className="text-[#4a7957]" size={24} />
              </div>
              {records.length === 0 ? (
                <p className="m-0 text-[#617067]">
                  Nenhum atendimento nesta data.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  {records.map((record) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[0.65rem] bg-[#f5f7f4] p-3 text-[#34443a]"
                      key={record.id}
                    >
                      <span className="grid min-w-0 gap-0.5">
                        <strong>{record.serviceName || "Serviço"}</strong>
                        <small className="text-xs text-[#617067]">
                          {paymentMethodLabel(record.paymentMethod)}
                          {record.createdBy
                            ? ` · Lançado por: ${record.createdBy.name}`
                            : ""}
                        </small>
                      </span>
                      <div className="grid shrink-0 justify-items-end gap-1 text-right">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f2ea] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                          Minha parte (50%):{" "}
                          <strong className="text-sm">
                            {formatCurrency(record.operatorShareCents)}
                          </strong>
                        </span>
                        <small className="text-xs text-[#617067]">
                          Valor bruto: {formatCurrency(record.priceCents)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
