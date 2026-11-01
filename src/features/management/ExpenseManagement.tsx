import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  createExpense,
  listExpensesByMonth,
} from "../../api/dailyCheckoutApi";
import type { Expense, PaymentMethod } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { getApiErrorMessage } from "../../lib/errors";
import { ApiError } from "../../api/client";
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getToday,
  monthOptions,
  paymentMethodLabel,
  paymentOptions,
  toExpenseDateTime,
} from "../../lib/formatters";

const fieldClass = "w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";

export function ExpenseManagement({ refreshToken = 0 }: { refreshToken?: number }) {
  const currentMonth = getCurrentMonth();
  const currentYear = currentMonth.slice(0, 4);
  const currentMonthNumber = currentMonth.slice(5, 7);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(
    currentMonth.slice(5, 7),
  );
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));
  const [expenseDate, setExpenseDate] = useState(getToday);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const selectedMonth =
    /^\d{4}$/.test(selectedYear) && /^\d{2}$/.test(selectedMonthNumber)
      ? `${selectedYear}-${selectedMonthNumber}`
      : "";

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
            : getApiErrorMessage(cause, "Não foi possível carregar as despesas."),
        );
      })
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
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
        occurredAt: toExpenseDateTime(expenseDate),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setDescription("");
      setAmount("");
      setCategory("");
      setNotes("");
      setSuccess("Despesa lançada com sucesso.");
      setLoading(true);
      setExpenses(await listExpensesByMonth(selectedMonth));
    } catch (cause: unknown) {
      console.error("Não foi possível lançar a despesa:", cause);
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "Seu perfil não possui acesso às despesas."
          : getApiErrorMessage(cause, "Não foi possível lançar a despesa."),
      );
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[#dce5dd] bg-white p-5 shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]">
      <div className="flex items-center justify-between gap-4">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">Controle financeiro</p><h2 className="m-0 text-base">Despesas</h2></div>
        <ClipboardList className="text-[#4a7957]" size={24} />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-bold text-[#34443a]">Mês de referência</span>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Mês
            <select
              className={fieldClass}
              onChange={(event) => {
                const month = `${selectedYear}-${event.target.value}`;
                setLoading(true);
                setError(null);
                setExpenses([]);
                setSelectedMonthNumber(event.target.value);
                setExpenseDate(
                  month === getCurrentMonth() ? getToday() : `${month}-01`,
                );
              }}
              value={selectedMonthNumber}
            >
              {monthOptions.map((option) => (
                <option
                  disabled={
                    selectedYear === currentYear &&
                    option.value > currentMonthNumber
                  }
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Ano
            <input
              className={fieldClass}
              inputMode="numeric"
              max={new Date().getFullYear()}
              min="2000"
              onChange={(event) => {
                const year = event.target.value;
                setLoading(true);
                setError(null);
                setExpenses([]);
                setSelectedYear(year);
                const month = `${year}-${selectedMonthNumber}`;
                if (/^\d{4}$/.test(year)) {
                  setExpenseDate(
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
      {!loading && !error && expenses.length === 0 && <p className="m-0 text-[#617067]">Nenhuma despesa lançada neste mês.</p>}
      {!loading && expenses.length > 0 && (
        <ul className="motion-stagger m-0 grid list-none gap-3 p-0" key={selectedMonth}>
          {expenses.map((expense) => <li className="flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f5f7f4] p-3" key={expense.id}><span className="grid gap-0.5"><strong>{expense.description}</strong><small className="text-xs text-[#617067]">{formatDate(expense.occurredAt)} · {paymentMethodLabel(expense.paymentMethod)}{expense.category ? ` · ${expense.category}` : ""}</small></span><b className="whitespace-nowrap text-[#a83e3e]">{formatCurrency(expense.amountCents)}</b></li>)}
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
        <form className="grid gap-3.5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Data da despesa<input className={fieldClass} max={getToday()} min={`${selectedMonth}-01`} onChange={(event) => setExpenseDate(event.target.value)} type="date" value={expenseDate} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Descrição<input className={fieldClass} maxLength={200} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: produtos de limpeza" required type="text" value={description} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Valor (R$)<input className={fieldClass} min="0.01" onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required step="0.01" type="number" value={amount} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Categoria (opcional)<input className={fieldClass} maxLength={100} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: materiais" type="text" value={category} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Forma de pagamento<select className={fieldClass} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} value={paymentMethod}>{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Observações (opcional)<textarea className={fieldClass} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhes adicionais" rows={3} value={notes} /></label>
          <Button disabled={submitting} type="submit">{submitting ? "Lançando..." : "Lançar despesa"}</Button>
        </form>
      </div>
      {success && <FeedbackMessage message={success} onClose={() => setSuccess(null)} />}
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
    </div>
  );
}
