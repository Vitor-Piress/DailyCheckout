import { Receipt, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { invalidateReportQueries } from "../../api/clientInvalidation";
import { createExpense } from "../../api/dailyCheckoutApi";
import type { Expense, ExpensePaymentMethod } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { InlineMutationProgress } from "../../components/ui/ProgressBar";
import { getApiErrorMessage } from "../../lib/errors";
import { expensePaymentOptions } from "../../lib/formatters";

const fieldClass =
  "min-h-12 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-base font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]";

export function ExpenseFormModal({
  defaultDueDate,
  onClose,
  onCreated,
}: {
  defaultDueDate: string;
  onClose: () => void;
  onCreated: (expense: Expense, submittedDueDate: string) => void;
}) {
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [description, setDescription] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError("Informe a data de vencimento / pagamento da despesa.");
      return;
    }
    if (!description.trim()) {
      setError("Informe a descrição da despesa.");
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setError("Informe um valor de despesa maior que zero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createExpense({
        description: description.trim(),
        amountCents: Math.trunc(amountCents),
        ...(category.trim() ? { category: category.trim() } : {}),
        paymentMethod,
        dueDate,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      invalidateReportQueries();
      onCreated(created, dueDate);
    } catch (cause: unknown) {
      console.error("Não foi possível lançar a despesa:", cause);
      setError(
        cause instanceof ApiError && cause.status === 403
          ? "Seu perfil não possui acesso às despesas."
          : getApiErrorMessage(cause, "Não foi possível lançar a despesa."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay
      ariaLabelledBy="expense-form-modal-title"
      disabled={submitting}
      maxWidthClass="max-w-[32rem]"
      onClose={onClose}
      sheetClassName="min-h-[85dvh] sm:min-h-0"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-4 pt-4 pb-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <Receipt aria-hidden="true" size={20} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
              Controle financeiro
            </p>
            <h2
              className="m-0 truncate text-lg font-bold text-[#17211b]"
              id="expense-form-modal-title"
            >
              Adicionar Despesa
            </h2>
          </div>
        </div>
        <IconButton
          aria-label="Fechar"
          className="shrink-0"
          disabled={submitting}
          icon={<X size={18} />}
          onClick={onClose}
          type="button"
        />
      </div>

      <form
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
            Data de vencimento / pagamento *
            <input
              className={fieldClass}
              min="2000-01-01"
              onChange={(event) => {
                setDueDate(event.target.value);
                if (error) setError(null);
              }}
              required
              type="date"
              value={dueDate}
            />
            <span className="text-xs font-normal text-[#617067]">
              A data de lançamento é registrada automaticamente hoje.
            </span>
          </label>

          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
            Descrição *
            <input
              className={fieldClass}
              maxLength={200}
              onChange={(event) => {
                setDescription(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex.: produtos de limpeza"
              required
              type="text"
              value={description}
            />
          </label>

          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
            Valor *
            <CurrencyInput
              className={`${fieldClass} font-bold tracking-tight`}
              maxDigits={9}
              onChangeCents={(nextCents) => {
                setAmountCents(nextCents);
                if (error) setError(null);
              }}
              required
              valueCents={amountCents}
            />
            <span className="text-xs font-normal text-[#617067]">
              Digite apenas números (preenchimento automático em centavos).
            </span>
          </label>

          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
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

          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
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

          <label className="grid shrink-0 gap-1.5 text-sm font-bold text-[#34443a]">
            Observações (opcional)
            <textarea
              className="min-h-[4.75rem] w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-base font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detalhes adicionais"
              rows={3}
              value={notes}
            />
          </label>

          <InlineMutationProgress
            active={submitting}
            label="Lançando despesa..."
          />

          {error && (
            <div className="shrink-0">
              <FeedbackMessage
                message={error}
                onClose={() => setError(null)}
                variant="error"
              />
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2.5 border-t border-[#e8eee9] bg-white px-4 pt-3 pb-4 sm:px-5">
          <Button
            className="!min-h-11 h-11 px-4 text-sm whitespace-nowrap"
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Cancelar
          </Button>
          <Button
            className="!min-h-11 h-11 text-sm whitespace-nowrap"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Lançando..." : "Lançar despesa"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
