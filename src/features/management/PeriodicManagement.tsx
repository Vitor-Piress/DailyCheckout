import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { getPeriodicReport } from "../../api/dailyCheckoutApi";
import { ApiError } from "../../api/client";
import type { Period, PeriodicReport } from "../../api/types";
import { SummaryList } from "../../components/reports/SummaryList";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { MetricCard } from "../../components/ui/MetricCard";
import { getApiErrorMessage } from "../../lib/errors";
import { formatCurrency, getToday, paymentMethodLabel, periodOptions } from "../../lib/formatters";

export function PeriodicManagement({ refreshToken = 0 }: { refreshToken?: number }) {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(getToday);
  const [report, setReport] = useState<PeriodicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPeriodicReport(period, date)
      .then(setReport)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar o relatório periódico:", cause);
        setError(
          cause instanceof ApiError && cause.status === 403
            ? "Este relatório é restrito ao perfil administrador."
            : getApiErrorMessage(
                cause,
                "Não foi possível carregar o relatório periódico.",
              ),
        );
      })
      .finally(() => setLoading(false));
  }, [date, period, refreshToken]);

  function changePeriod(value: Period) {
    setLoading(true);
    setError(null);
    setPeriod(value);
  }

  function changeDate(value: string) {
    setLoading(true);
    setError(null);
    setDate(value);
  }

  const inputClass = "min-h-11 rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]";
  return (
    <div className="grid gap-4 rounded-2xl border border-[#dce5dd] bg-white p-5 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]">
      <div className="flex items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">Análise financeira</p><h2 className="m-0 text-base">Relatório periódico</h2></div>
        <BarChart3 className="text-[#4a7957]" size={24} />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Período<select className={inputClass} onChange={(event) => changePeriod(event.target.value as Period)} value={period}>{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Data de referência<input className={inputClass} max={getToday()} onChange={(event) => changeDate(event.target.value)} type="date" value={date} /></label>
      </div>
      {loading && <LoadingMessage>Carregando relatório periódico...</LoadingMessage>}
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
      {!loading && !error && report && <><p className="m-0 text-sm text-[#617067]">Período: {report.startDate} a {report.endDate}</p><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><MetricCard label="Receita bruta" value={formatCurrency(report.grossRevenueCents)} /><MetricCard label="Despesas" value={formatCurrency(report.expensesCents)} /><MetricCard label="Resultado líquido" value={formatCurrency(report.netRevenueCents)} /><MetricCard label="Atendimentos" value={report.serviceCount} /></div><div><h2 className="mb-4 text-base">Despesas por forma de pagamento</h2><SummaryList emptyMessage="Nenhuma despesa registrada neste período." items={report.expensesByPaymentMethod.map((payment) => ({ label: paymentMethodLabel(payment.paymentMethod), detail: `${payment.quantity} despesa(s)`, value: formatCurrency(payment.totalCents) }))} /></div></>}
    </div>
  );
}
