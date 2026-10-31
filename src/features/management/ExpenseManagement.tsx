import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createExpense, listExpenses } from "../../api/dailyCheckoutApi";
import type { Expense, PaymentMethod } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { getApiErrorMessage } from "../../lib/errors";
import { formatCurrency, getToday, paymentMethodLabel, paymentOptions } from "../../lib/formatters";

const fieldClass = "w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";

export function ExpenseManagement({ refreshToken }: { refreshToken: number }) {
  const [date, setDate] = useState(getToday);
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

  useEffect(() => {
    void listExpenses(date)
      .then(setExpenses)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar as despesas:", cause);
        setError(getApiErrorMessage(cause, "Não foi possível carregar as despesas."));
      })
      .finally(() => setLoading(false));
  }, [date, refreshToken]);

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
        occurredAt: new Date(`${date}T12:00:00`).toISOString(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setDescription("");
      setAmount("");
      setCategory("");
      setNotes("");
      setSuccess("Despesa lançada com sucesso.");
      setLoading(true);
      setExpenses(await listExpenses(date));
    } catch (cause: unknown) {
      console.error("Não foi possível lançar a despesa:", cause);
      setError(getApiErrorMessage(cause, "Não foi possível lançar a despesa."));
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
      <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
        Data das despesas
        <input
          className={fieldClass}
          max={getToday()}
          onChange={(event) => {
            setLoading(true);
            setError(null);
            setDate(event.target.value);
          }}
          type="date"
          value={date}
        />
      </label>
      {loading && <LoadingMessage>Carregando despesas...</LoadingMessage>}
      {!loading && !error && expenses.length === 0 && <p className="m-0 text-[#617067]">Nenhuma despesa lançada nesta data.</p>}
      {!loading && expenses.length > 0 && <ul className="m-0 grid list-none gap-3 p-0">{expenses.map((expense) => <li className="flex items-center justify-between gap-4 rounded-[0.65rem] bg-[#f5f7f4] p-3" key={expense.id}><span className="grid gap-0.5"><strong>{expense.description}</strong><small className="text-xs text-[#617067]">{paymentMethodLabel(expense.paymentMethod)}{expense.category ? ` · ${expense.category}` : ""}</small></span><b className="whitespace-nowrap text-[#a83e3e]">{formatCurrency(expense.amountCents)}</b></li>)}</ul>}
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
      {isFormOpen && (
        <form className="grid gap-3.5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Descrição<input className={fieldClass} maxLength={200} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: produtos de limpeza" required type="text" value={description} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Valor (R$)<input className={fieldClass} min="0.01" onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required step="0.01" type="number" value={amount} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Categoria (opcional)<input className={fieldClass} maxLength={100} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: materiais" type="text" value={category} /></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Forma de pagamento<select className={fieldClass} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} value={paymentMethod}>{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">Observações (opcional)<textarea className={fieldClass} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhes adicionais" rows={3} value={notes} /></label>
          <Button disabled={submitting} type="submit">{submitting ? "Lançando..." : "Lançar despesa"}</Button>
        </form>
      )}
      {success && <FeedbackMessage message={success} onClose={() => setSuccess(null)} />}
      {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
    </div>
  );
}
