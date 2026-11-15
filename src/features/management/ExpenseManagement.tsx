import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { listExpensesByMonth } from "../../api/dailyCheckoutApi";
import type { Expense } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { getApiErrorMessage } from "../../lib/errors";
import {
  formatCurrency,
  formatDate,
  formatIsoDate,
  getCurrentMonth,
  getToday,
  monthOptions,
  paymentMethodLabel,
} from "../../lib/formatters";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { useManagementRefreshToken } from "./managementContext";

const fieldClass =
  "w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";
const controlHeightClass = "h-[42px] !min-h-0";

export function ExpenseManagement({
  refreshToken: propRefreshToken,
}: {
  refreshToken?: number;
}) {
  const outletRefreshToken = useManagementRefreshToken();
  const refreshToken = propRefreshToken ?? outletRefreshToken;
  const currentMonth = getCurrentMonth();
  const currentYearNumber = Number(currentMonth.slice(0, 4));
  const maxYearNumber = currentYearNumber + 5;
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(
    currentMonth.slice(5, 7),
  );
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const selectedMonth =
    /^\d{4}$/.test(selectedYear) && /^\d{2}$/.test(selectedMonthNumber)
      ? `${selectedYear}-${selectedMonthNumber}`
      : "";
  const selectedMonthIndex =
    /^\d{4}$/.test(selectedYear) && /^\d{2}$/.test(selectedMonthNumber)
      ? Number(selectedYear) * 12 + Number(selectedMonthNumber) - 1
      : null;
  const minimumMonthIndex = 2000 * 12;
  const maximumMonthIndex = maxYearNumber * 12 + 11;
  const defaultDueDate =
    selectedMonth === currentMonth
      ? getToday()
      : selectedMonth
        ? `${selectedMonth}-01`
        : getToday();
  const monthTotalCents = expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );

  function navigateMonth(direction: -1 | 1) {
    if (selectedMonthIndex === null) {
      return;
    }

    const targetMonthIndex = selectedMonthIndex + direction;
    if (
      targetMonthIndex < minimumMonthIndex ||
      targetMonthIndex > maximumMonthIndex
    ) {
      return;
    }

    const targetYear = Math.floor(targetMonthIndex / 12).toString();
    const targetMonthNumber = String((targetMonthIndex % 12) + 1).padStart(
      2,
      "0",
    );
    setLoading(true);
    setError(null);
    setExpenses([]);
    setSelectedYear(targetYear);
    setSelectedMonthNumber(targetMonthNumber);
  }

  useEffect(() => {
    if (!selectedMonth) {
      return;
    }

    let cancelled = false;
    void listExpensesByMonth(selectedMonth)
      .then((data) => {
        if (!cancelled) {
          setExpenses(data);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("Não foi possível carregar as despesas:", cause);
        setError(
          cause instanceof ApiError && cause.status === 403
            ? "Seu perfil não possui acesso às despesas."
            : getApiErrorMessage(
                cause,
                "Não foi possível carregar as despesas.",
              ),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, refreshToken]);

  async function handleExpenseCreated(
    createdExpense: Expense,
    submittedDueDate: string,
  ) {
    const effectiveDueDate =
      createdExpense.dueDate?.slice(0, 10) || submittedDueDate;
    const dueMonth = effectiveDueDate.slice(0, 7);

    setIsCreateModalOpen(false);
    setError(null);
    setSuccess(
      `Despesa lançada com sucesso (vencimento em ${formatIsoDate(effectiveDueDate)}).`,
    );

    if (dueMonth !== selectedMonth) {
      const [dueYear, dueMonthNumber] = dueMonth.split("-");
      if (dueYear && dueMonthNumber) {
        setLoading(true);
        setExpenses([]);
        setSelectedYear(dueYear);
        setSelectedMonthNumber(dueMonthNumber);
      }
      return;
    }

    setLoading(true);
    try {
      setExpenses(await listExpensesByMonth(selectedMonth));
    } catch (cause: unknown) {
      console.error("Não foi possível atualizar a lista de despesas:", cause);
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "Seu perfil não possui acesso às despesas."
          : getApiErrorMessage(
              cause,
              "Despesa lançada, mas não foi possível atualizar a lista.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 rounded-2xl border border-[#dce5dd] bg-white p-4 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            Controle financeiro
          </p>
          <h2 className="m-0 text-base text-[#17211b] sm:text-lg">Despesas</h2>
        </div>
        <Button
          className="!min-h-11 h-11 flex w-full shrink-0 items-center justify-center gap-1.5 px-3.5 text-sm whitespace-nowrap min-[380px]:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          <span>Adicionar Despesa</span>
        </Button>
      </div>

      {success && (
        <FeedbackMessage message={success} onClose={() => setSuccess(null)} />
      )}
      {error && (
        <FeedbackMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}

      <div className="grid min-w-0 gap-1.5">
        <span className="text-sm font-bold text-[#34443a]">
          Mês de vencimento
        </span>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="grid min-w-0 gap-1.5 text-sm font-bold text-[#34443a]">
            <span>Mês</span>
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                aria-label="Mês anterior"
                className={`${fieldClass} ${controlHeightClass} !w-11 !min-w-11 shrink-0 flex items-center justify-center bg-[#f5f7f4] px-3 py-2 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] disabled:cursor-not-allowed disabled:opacity-45`}
                disabled={
                  selectedMonthIndex === null ||
                  selectedMonthIndex <= minimumMonthIndex
                }
                onClick={() => navigateMonth(-1)}
                title="Mês anterior"
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <select
                className={`${fieldClass} ${controlHeightClass} min-w-0 flex-1 cursor-pointer`}
                onChange={(event) => {
                  setLoading(true);
                  setError(null);
                  setExpenses([]);
                  setSelectedMonthNumber(event.target.value);
                }}
                value={selectedMonthNumber}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                aria-label="Próximo mês"
                className={`${fieldClass} ${controlHeightClass} !w-11 !min-w-11 shrink-0 flex items-center justify-center bg-[#f5f7f4] px-3 py-2 text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] disabled:cursor-not-allowed disabled:opacity-45`}
                disabled={
                  selectedMonthIndex === null ||
                  selectedMonthIndex >= maximumMonthIndex
                }
                onClick={() => navigateMonth(1)}
                title="Próximo mês"
                type="button"
              >
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-[#34443a]">
            Ano
            <input
              className={`${fieldClass} ${controlHeightClass}`}
              inputMode="numeric"
              max={maxYearNumber}
              min="2000"
              onChange={(event) => {
                const year = event.target.value;
                setLoading(true);
                setError(null);
                setExpenses([]);
                setSelectedYear(year);
                if (!/^\d{4}$/.test(year)) {
                  setLoading(false);
                }
              }}
              type="number"
              value={selectedYear}
            />
          </label>
        </div>
      </div>

      {loading && <LoadingMessage>Carregando despesas...</LoadingMessage>}

      {!loading && !error && expenses.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-[#c8d6ca] bg-[#f5f7f4] p-4 text-sm text-[#617067]">
          Nenhuma despesa com vencimento neste mês.
        </p>
      )}

      {!loading && expenses.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] px-3.5 py-2.5 text-xs">
            <span className="font-bold text-[#34443a]">
              {expenses.length}{" "}
              {expenses.length === 1 ? "despesa no mês" : "despesas no mês"}
            </span>
            <strong className="text-sm font-extrabold text-[#a83e3e]">
              Total: {formatCurrency(monthTotalCents)}
            </strong>
          </div>

          <ul
            className="motion-stagger m-0 grid min-w-0 list-none gap-3 p-0"
            key={selectedMonth}
          >
            {expenses.map((expense) => (
              <li
                className="flex min-w-0 items-start justify-between gap-3 rounded-[0.65rem] border border-[#e5ede7] bg-[#f5f7f4] p-3 sm:gap-4"
                key={expense.id}
              >
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#c8d6ca] bg-white px-2 py-0.5 text-xs font-bold text-[#23372a]">
                      <CalendarClock
                        aria-hidden="true"
                        className="text-[#4a7957]"
                        size={13}
                      />
                      Vencimento: {formatIsoDate(expense.dueDate)}
                    </span>
                    {expense.category && (
                      <span className="rounded-md bg-[#e8f2ea] px-2 py-0.5 text-xs font-bold text-[#2f6840]">
                        {expense.category}
                      </span>
                    )}
                  </div>
                  <strong className="break-words text-[#23372a]">
                    {expense.description}
                  </strong>
                  <small className="text-xs text-[#617067]">
                    {paymentMethodLabel(expense.paymentMethod)} · Lançado em{" "}
                    {formatDate(expense.createdAt)}
                  </small>
                  {expense.notes && (
                    <small className="break-words text-xs text-[#617067]">
                      {expense.notes}
                    </small>
                  )}
                </div>
                <b className="shrink-0 whitespace-nowrap pt-0.5 text-[#a83e3e]">
                  {formatCurrency(expense.amountCents)}
                </b>
              </li>
            ))}
          </ul>
        </>
      )}

      <AnimatePresence>
        {isCreateModalOpen && (
          <ExpenseFormModal
            defaultDueDate={defaultDueDate}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={handleExpenseCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
