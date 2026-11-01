import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  closeDailySettlement,
  getDailyReport,
  getDailySettlement,
  listServiceRecords,
} from "../../api/dailyCheckoutApi";
import { ApiError } from "../../api/client";
import type {
  DailyReport,
  DailySettlement,
  ServiceRecord,
} from "../../api/types";
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
  const [report, setReport] = useState<DailyReport | null>(null);
  const [settlement, setSettlement] = useState<DailySettlement | null>(null);
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const groupedRecords = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; records: ServiceRecord[] }
    >();

    for (const record of records) {
      const groupKey = record.createdBy?.id ?? "unknown";
      const groupName = record.createdBy?.name ?? "Autor não identificado";
      const group = groups.get(groupKey);
      if (group) {
        group.records.push(record);
      } else {
        groups.set(groupKey, { name: groupName, records: [record] });
      }
    }

    return [...groups.values()];
  }, [records]);

  useEffect(() => {
    const reportRequest = Promise.all([
      listServiceRecords(date),
      getDailyReport(date),
    ]);
    const settlementRequest =
      role === "admin"
        ? getDailySettlement(date).catch((cause: unknown) => {
            if (cause instanceof ApiError && cause.status === 404) {
              return null;
            }
            if (cause instanceof ApiError && cause.status === 403) {
              setSettlementMessage(
                "Seu perfil não possui permissão para consultar o fechamento.",
              );
              return null;
            }
            throw cause;
          })
        : Promise.resolve(null);
    void Promise.all([reportRequest, settlementRequest])
      .then(([[serviceRecords, dailyReport], dailySettlement]) => {
        setRecords(serviceRecords);
        setReport(dailyReport);
        setSettlement(dailySettlement);
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
    setSettlement(null);
    setSettlementMessage(null);
    setDate(value);
  }

  function navigateDate(direction: -1 | 1) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + direction));
    changeDate(nextDate.toISOString().slice(0, 10));
  }

  const calculatedSettlement = report?.settlement;
  const displayedSettlement: DailySettlement | null =
    settlement ??
    (calculatedSettlement
      ? {
          date,
          status: "open",
          closedAt: null,
          admin: {
            ownServicesCents: calculatedSettlement.adminOwnServicesCents,
            dailyOperatorsShareCents:
              calculatedSettlement.adminDailyOperatorsShareCents,
            totalDueCents: calculatedSettlement.adminTotalDueCents,
          },
          dailyOperators: calculatedSettlement.dailyOperators,
          grossServicesCents: calculatedSettlement.grossServicesCents,
          dailyOperatorsTotalDueCents:
            calculatedSettlement.dailyOperatorsTotalDueCents,
        }
      : null);

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
      const closedSettlement = await closeDailySettlement(date);
      setSettlement(closedSettlement);
      setSettlementMessage("Caixa fechado com sucesso.");
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.status === 409) {
        try {
          setSettlement(await getDailySettlement(date));
          setSettlementMessage("O caixa deste dia já foi fechado.");
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
          <div className="motion-content grid gap-4 sm:grid-cols-2" key={date}>
            <MetricCard label="Atendimentos" value={report.serviceCount} />
            <MetricCard
              label="Receita bruta"
              value={formatCurrency(report.grossRevenueCents)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReportList
              emptyMessage="Nenhum serviço registrado nesta data."
              items={report.services.map((service) => ({
                label: service.serviceName,
                detail: `${service.quantity} atendimento(s)`,
                value: formatCurrency(service.totalCents),
              }))}
              title="Resumo por serviço"
            />
            <ReportList
              emptyMessage="Nenhum pagamento registrado nesta data."
              items={report.paymentMethods.map((payment) => ({
                label: paymentMethodLabel(payment.paymentMethod),
                detail: `${payment.quantity} pagamento(s)`,
                value: formatCurrency(payment.totalCents),
              }))}
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
                        {formatDateTime(displayedSettlement.closedAt)}.
                      </p>
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
              <div
                className={
                  role === "admin"
                    ? "grid gap-4 sm:grid-cols-2 sm:items-start"
                    : "grid gap-5"
                }
              >
                {(role === "admin"
                  ? groupedRecords
                  : [{ name: "", records }]
                ).map((group) => (
                  <div
                    className={
                      role === "admin"
                        ? "grid gap-3 rounded-xl border border-[#dce5dd] bg-white p-3.5"
                        : "grid gap-2.5"
                    }
                    key={group.name || "records"}
                  >
                    {role === "admin" && (
                      <h3 className="m-0 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#34443a]">
                        {group.name}
                      </h3>
                    )}
                    <ul className="m-0 grid list-none gap-2.5 p-0">
                      {group.records.map((record) => (
                        <li
                          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-[0.65rem] bg-[#f5f7f4] p-3 text-[#34443a]"
                          key={record.id}
                        >
                          <span className="grid gap-0.5">
                            <strong>{record.serviceName ?? "Serviço"}</strong>
                            {role !== "admin" && record.createdBy && (
                              <small className="text-xs text-[#617067]">
                                Lançado por: {record.createdBy.name}
                              </small>
                            )}
                          </span>
                          <span className="text-center text-xs text-[#617067]">
                            {paymentMethodLabel(record.paymentMethod)}
                          </span>
                          <b className="justify-self-end whitespace-nowrap text-[#2f6840]">
                            {formatCurrency(record.priceCents)}
                          </b>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
