import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getDailyReport,
  listServiceRecords,
} from "../../api/dailyCheckoutApi";
import type { DailyReport, ServiceRecord } from "../../api/types";
import { ReportList } from "../../components/reports/ReportList";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { MetricCard } from "../../components/ui/MetricCard";
import { Panel } from "../../components/ui/Panel";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCurrency,
  getToday,
  paymentMethodLabel,
} from "../../lib/formatters";

export function DailyManagement({ refreshToken }: { refreshToken: number }) {
  const [date, setDate] = useState(getToday);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5 rounded-xl border border-[#dce5dd] bg-white p-4">
        <label className="text-sm font-bold text-[#34443a]" htmlFor="report-date">
          Data do acompanhamento
        </label>
        <input
          className="min-h-11 rounded-[0.55rem] border border-[#c8d6ca] px-3 py-2 text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
          id="report-date"
          max={getToday()}
          onChange={(event) => {
            setLoading(true);
            setError(null);
            setDate(event.target.value);
          }}
          type="date"
          value={date}
        />
      </div>
      {loading && <LoadingMessage>Carregando dados do dia...</LoadingMessage>}
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
      {!loading && !error && report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {records.map((record) => (
                  <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-[0.65rem] bg-[#f5f7f4] p-3 text-[#34443a]" key={record.id}>
                    <strong>{record.serviceName ?? "Serviço"}</strong>
                    <span className="text-center text-xs text-[#617067]">{paymentMethodLabel(record.paymentMethod)}</span>
                    <b className="justify-self-end whitespace-nowrap text-[#2f6840]">{formatCurrency(record.priceCents)}</b>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
