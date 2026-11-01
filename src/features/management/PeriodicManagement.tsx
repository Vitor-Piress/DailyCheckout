import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getPeriodicReport } from "../../api/dailyCheckoutApi";
import { ApiError } from "../../api/client";
import type { Period, PeriodicReport } from "../../api/types";
import { SummaryList } from "../../components/reports/SummaryList";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { MetricCard } from "../../components/ui/MetricCard";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCurrency,
  getCurrentMonth,
  monthOptions,
  paymentMethodLabel,
  periodOptions,
} from "../../lib/formatters";

export function PeriodicManagement({ refreshToken = 0 }: { refreshToken?: number }) {
  const [period, setPeriod] = useState<Period>("month");
  const currentMonth = getCurrentMonth();
  const currentYear = currentMonth.slice(0, 4);
  const currentMonthNumber = currentMonth.slice(5, 7);
  const [referenceMonthNumber, setReferenceMonthNumber] = useState(
    currentMonthNumber,
  );
  const [referenceYear, setReferenceYear] = useState(currentYear);
  const [report, setReport] = useState<PeriodicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function periodStartMonth(value: Period, month: string): string {
    const monthNumber = Number(month);
    if (value === "quarter") {
      return String(Math.floor((monthNumber - 1) / 3) * 3 + 1).padStart(2, "0");
    }
    if (value === "semester") {
      return monthNumber <= 6 ? "01" : "07";
    }
    if (value === "year") {
      return "01";
    }
    return month;
  }

  useEffect(() => {
    const referenceMonth = `${referenceYear}-${referenceMonthNumber}`;
    void getPeriodicReport(period, `${referenceMonth}-01`)
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
  }, [period, referenceMonthNumber, referenceYear, refreshToken]);

  function changePeriod(value: Period) {
    setLoading(true);
    setError(null);
    setReport(null);
    setPeriod(value);
    setReferenceMonthNumber((month) => periodStartMonth(value, month));
  }

  function changeReferenceMonth(value: string) {
    if (!value) {
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    const [year, month] = value.split("-");
    if (year && month) {
      setReferenceYear(year);
      setReferenceMonthNumber(month);
    }
  }

  const inputClass =
    "min-h-11 rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]";
  const controlHeightClass = "h-[42px] !min-h-0";
  const referenceMonth =
    /^\d{4}$/.test(referenceYear) && /^\d{2}$/.test(referenceMonthNumber)
      ? `${referenceYear}-${referenceMonthNumber}`
      : "";
  const referenceMonthIndex = referenceMonth
    ? Number(referenceYear) * 12 + Number(referenceMonthNumber) - 1
    : null;
  const currentMonthIndex =
    Number(currentYear) * 12 + Number(currentMonthNumber) - 1;
  const minimumMonthIndex = 2000 * 12;

  function navigateReferenceMonth(direction: number) {
    if (referenceMonthIndex === null) {
      return;
    }

    const targetMonthIndex = referenceMonthIndex + direction;
    if (
      targetMonthIndex < minimumMonthIndex ||
      targetMonthIndex > currentMonthIndex
    ) {
      return;
    }

    const year = Math.floor(targetMonthIndex / 12).toString();
    const month = String((targetMonthIndex % 12) + 1).padStart(2, "0");
    changeReferenceMonth(`${year}-${month}`);
  }

  function changeReferenceMonthParts(year: string, month: string) {
    changeReferenceMonth(`${year}-${month}`);
  }

  function changeReferenceYear(year: string) {
    if (year) {
      changeReferenceMonth(`${year}-${referenceMonthNumber}`);
    }
  }

  const periodMonthOptions =
    period === "quarter"
      ? [
          { value: "01", label: "Jan - Mar" },
          { value: "04", label: "Abr - Jun" },
          { value: "07", label: "Jul - Set" },
          { value: "10", label: "Out - Dez" },
        ]
      : period === "semester"
        ? [
            { value: "01", label: "Jan - Jun" },
            { value: "07", label: "Jul - Dez" },
          ]
        : monthOptions;
  return (
    <div className="grid gap-4 rounded-2xl border border-[#dce5dd] bg-white p-5 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]">
      <div className="flex items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">Análise financeira</p><h2 className="m-0 text-base">Relatório periódico</h2></div>
        <BarChart3 className="text-[#4a7957]" size={24} />
      </div>
      <div className="grid gap-3.5">
        <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
          Período
          <select
            className={inputClass}
            onChange={(event) =>
              changePeriod(event.target.value as Period)
            }
            value={period}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-end">
          <div className="grid min-w-0 gap-1.5 text-sm font-bold text-[#34443a]">
            <span>{period === "year" ? "Ano de referência" : "Referência"}</span>
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                aria-label={period === "year" ? "Ano anterior" : "Período anterior"}
                className={`${inputClass} ${controlHeightClass} !w-11 !min-w-11 shrink-0 flex items-center justify-center bg-[#f5f7f4] px-3 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] disabled:cursor-not-allowed disabled:opacity-45`}
                disabled={
                  period === "year"
                    ? referenceYear <= "2000"
                    : referenceMonthIndex === null ||
                      referenceMonthIndex <= minimumMonthIndex
                }
                onClick={() =>
                  period === "year"
                    ? changeReferenceYear(String(Number(referenceYear) - 1))
                    : navigateReferenceMonth(period === "month" ? -1 : -3)
                }
                title={period === "year" ? "Ano anterior" : "Período anterior"}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              {period !== "year" && <select
                aria-label="Referência do período"
                className={`${inputClass} ${controlHeightClass} min-w-0 flex-1 cursor-pointer`}
                onChange={(event) =>
                  changeReferenceMonthParts(
                    referenceYear,
                    event.target.value,
                  )
                }
                value={referenceMonthNumber}
              >
                {periodMonthOptions.map((option) => (
                  <option
                    disabled={
                      referenceYear === currentYear &&
                      option.value > currentMonthNumber
                    }
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>}
              {period === "year" && (
                <input
                  aria-label="Ano de referência"
                  className={`${inputClass} ${controlHeightClass} min-w-0 flex-1`}
                  inputMode="numeric"
                  max={currentYear}
                  min="2000"
                  onChange={(event) => changeReferenceYear(event.target.value)}
                  type="number"
                  value={referenceYear}
                />
              )}
              <button
                aria-label={period === "year" ? "Próximo ano" : "Próximo período"}
                className={`${inputClass} ${controlHeightClass} !w-11 !min-w-11 shrink-0 flex items-center justify-center bg-[#f5f7f4] px-3 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] disabled:cursor-not-allowed disabled:opacity-45`}
                disabled={
                  period === "year"
                    ? referenceYear >= currentYear
                    : referenceMonthIndex === null ||
                      referenceMonthIndex >= currentMonthIndex
                }
                onClick={() =>
                  period === "year"
                    ? changeReferenceYear(String(Number(referenceYear) + 1))
                    : navigateReferenceMonth(period === "month" ? 1 : 3)
                }
                title={period === "year" ? "Próximo ano" : "Próximo período"}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
          {period !== "year" && <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Ano
            <input
              aria-label="Ano inicial"
              className={`${inputClass} ${controlHeightClass}`}
              inputMode="numeric"
              max={currentYear}
              min="2000"
              onChange={(event) =>
                changeReferenceYear(event.target.value)
              }
              type="number"
              value={referenceYear}
            />
          </label>}
        </div>
      </div>
      {loading && <LoadingMessage>Carregando relatório periódico...</LoadingMessage>}
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
      {!loading && !error && report && (
        <div
          className="motion-content grid gap-4"
          key={`${period}-${referenceMonth}`}
        >
          <p className="m-0 text-sm text-[#617067]">Período: {report.startDate} a {report.endDate}</p>
          <div className="motion-stagger grid min-w-0 grid-cols-1 gap-4 min-[26rem]:grid-cols-2 sm:grid-cols-4">
            <MetricCard label="Receita bruta" value={formatCurrency(report.grossRevenueCents)} />
            <MetricCard label="Despesas" value={formatCurrency(report.expensesCents)} />
            <MetricCard label="Resultado líquido" value={formatCurrency(report.netRevenueCents)} />
            <MetricCard label="Atendimentos" value={report.serviceCount} />
          </div>
          <div>
            <h2 className="mb-4 text-base">Despesas por forma de pagamento</h2>
            <SummaryList emptyMessage="Nenhuma despesa registrada neste período." items={report.expensesByPaymentMethod.map((payment) => ({ label: paymentMethodLabel(payment.paymentMethod), detail: `${payment.quantity} despesa(s)`, value: formatCurrency(payment.totalCents) }))} />
          </div>
        </div>
      )}
    </div>
  );
}
