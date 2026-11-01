import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getDailyReport,
  listServiceRecords,
} from "../../api/dailyCheckoutApi";
import type { DailyReport, ServiceRecord } from "../../api/types";
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
  getToday,
  paymentMethodLabel,
} from "../../lib/formatters";

export function DailyManagement({ refreshToken }: { refreshToken: number }) {
  const { role } = useAuth();
  const [date, setDate] = useState(getToday);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
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
    void Promise.all([listServiceRecords(date), getDailyReport(date)])
      .then(([serviceRecords, dailyReport]) => {
        setRecords(serviceRecords);
        setReport(dailyReport);
      })
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar o acompanhamento diário:", cause);
        setError(getApiErrorMessage(cause, "Não foi possível carregar os dados do dia."));
      })
      .finally(() => setLoading(false));
  }, [date, refreshToken]);

  function changeDate(value: string) {
    if (!value) {
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setRecords([]);
    setDate(value);
  }

  function navigateDate(direction: -1 | 1) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + direction));
    changeDate(nextDate.toISOString().slice(0, 10));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5 rounded-xl border border-[#dce5dd] bg-white p-4">
        <label className="text-sm font-bold text-[#34443a]" htmlFor="report-date">
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
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
      {!loading && !error && report && (
        <>
          <div className="motion-content grid gap-4 sm:grid-cols-2" key={date}>
            <MetricCard label="Atendimentos" value={report.serviceCount} />
            <MetricCard label="Receita bruta" value={formatCurrency(report.grossRevenueCents)} />
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
          <UserReportGroups users={report.users ?? []} />
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
                  Atendimentos realizados
                </p>
                <h2 className="m-0 text-base leading-tight">Registros do dia</h2>
              </div>
              <ClipboardList className="text-[#4a7957]" size={24} />
            </div>
            {records.length === 0 ? (
              <p className="m-0 text-[#617067]">Nenhum atendimento nesta data.</p>
            ) : (
              <div
                className={
                  role === "admin"
                    ? "grid gap-4 sm:grid-cols-2 sm:items-start"
                    : "grid gap-5"
                }
              >
                {(role === "admin" ? groupedRecords : [{ name: "", records }]).map(
                  (group) => (
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
                  ),
                )}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
