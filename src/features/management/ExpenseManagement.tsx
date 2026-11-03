import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createExpense, listExpensesByMonth } from "../../api/dailyCheckoutApi";
import type { Expense, ExpensePaymentMethod } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { getApiErrorMessage } from "../../lib/errors";
import { ApiError } from "../../api/client";
import {
  expensePaymentOptions,
  formatCurrency,
  formatDate,
  formatIsoDate,
  getCurrentMonth,
  getToday,
  monthOptions,
  paymentMethodLabel,
} from "../../lib/formatters";

const fieldClass =
  "w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";
const controlHeightClass = "h-[42px] !min-h-0";

export function ExpenseManagement({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const currentMonth = getCurrentMonth();
  const currentYearNumber = Number(currentMonth.slice(0, 4));
  const maxYearNumber = currentYearNumber + 5;
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(
    currentMonth.slice(5, 7),
  );
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));
  const [dueDate, setDueDate] = useState(getToday);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    const month = `${targetYear}-${targetMonthNumber}`;
    setLoading(true);
    setError(null);
    setExpenses([]);
    setSelectedYear(targetYear);
    setSelectedMonthNumber(targetMonthNumber);
    setDueDate(month === getCurrentMonth() ? getToday() : `${month}-01`);
  }

  useEffect(() => {
    if (!selectedMonth) {
      return;
    }

    void listExpensesByMonth(selectedMonth)
      .then(setExpenses)
      .catch((cause: unknown) => {
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
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return setError("Informe a data de vencimento / pagamento da despesa.");
    }
    if (!description.trim()) return setError("Informe a descrição da despesa.");
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      return setError("Informe um valor de despesa maior que zero.");
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createExpense({
        description: description.trim(),
        amountCents,
        ...(category.trim() ? { category: category.trim() } : {}),
        paymentMethod,
        dueDate,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      const dueMonth = dueDate.slice(0, 7);
      setDescription("");
      setAmount("");
      setCategory("");
      setNotes("");
      setSuccess(
        `Despesa lançada com sucesso (vencimento em ${formatIsoDate(dueDate)}).`,
      );
      setLoading(true);
      if (dueMonth !== selectedMonth) {
        const [dueYear, dueMonthNumber] = dueMonth.split("-");
        if (dueYear && dueMonthNumber) {
          setSelectedYear(dueYear);
          setSelectedMonthNumber(dueMonthNumber);
        }
      } else {
        setExpenses(await listExpensesByMonth(selectedMonth));
        setLoading(false);
      }
    } catch (cause: unknown) {
      console.error("Não foi possível lançar a despesa:", cause);
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "Seu perfil não possui acesso às despesas."
          : getApiErrorMessage(cause, "Não foi possível lançar a despesa."),
      );
      setLoading(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[#dce5dd] bg-white p-5 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            Controle financeiro
          </p>
          <h2 className="m-0 text-base">Despesas</h2>
        </div>
        <ClipboardList className="text-[#4a7957]" size={24} />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-bold text-[#34443a]">
          Mês de vencimento
        </span>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <div className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            <span>Mês</span>
            <div className="flex items-center gap-1.5">
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
                  const month = `${selectedYear}-${event.target.value}`;
                  setLoading(true);
                  setError(null);
                  setExpenses([]);
                  setSelectedMonthNumber(event.target.value);
                  setDueDate(
                    month === getCurrentMonth() ? getToday() : `${month}-01`,
                  );
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
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
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
                const month = `${year}-${selectedMonthNumber}`;
                if (/^\d{4}$/.test(year)) {
                  setDueDate(
                    month === getCurrentMonth() ? getToday() : `${month}-01`,
                  );
                } else {
                  setExpenses([]);
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
        <p className="m-0 text-[#617067]">
          Nenhuma despesa com vencimento neste mês.
        </p>
      )}
      {!loading && expenses.length > 0 && (
        <ul
          className="motion-stagger m-0 grid list-none gap-3 p-0"
          key={selectedMonth}
        >
          {expenses.map((expense) => (
            <li
              className="flex items-start justify-between gap-4 rounded-[0.65rem] bg-[#f5f7f4] p-3"
              key={expense.id}
            >
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
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
      )}
      <Button
        aria-expanded={isFormOpen}
        className="flex w-full items-center justify-center gap-2"
        onClick={() => setIsFormOpen((open) => !open)}
        type="button"
        variant="secondary"
      >
        {isFormOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        <span>{isFormOpen ? "Fechar formulário" : "Adicionar despesa"}</span>
      </Button>
      <div
        aria-hidden={!isFormOpen}
        className="motion-expand"
        data-expanded={isFormOpen}
        inert={!isFormOpen}
      >
        <form
          className="grid gap-3.5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Data de vencimento / pagamento
            <input
              className={fieldClass}
              min="2000-01-01"
              onChange={(event) => setDueDate(event.target.value)}
              required
              type="date"
              value={dueDate}
            />
            <span className="text-xs font-normal text-[#617067]">
              A data de lançamento é registrada automaticamente hoje.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Descrição
            <input
              className={fieldClass}
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: produtos de limpeza"
              required
              type="text"
              value={description}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Valor (R$)
            <input
              className={fieldClass}
              min="0.01"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Categoria (opcional)
            <input
              className={fieldClass}
              maxLength={100}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Ex.: materiais"
              type="text"
              value={category}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Forma de pagamento
            <select
              className={fieldClass}
              onChange={(event) =>
                setPaymentMethod(event.target.value as ExpensePaymentMethod)
              }
              value={paymentMethod}
            >
              {expensePaymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Observações (opcional)
            <textarea
              className={fieldClass}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detalhes adicionais"
              rows={3}
              value={notes}
            />
          </label>
          <Button disabled={submitting} type="submit">
            {submitting ? "Lançando..." : "Lançar despesa"}
          </Button>
        </form>
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
    </div>
  );
}
