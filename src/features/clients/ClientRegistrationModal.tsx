import { ChevronDown, ChevronUp, UserPlus, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { createClient, updateClient } from "../../api/dailyCheckoutApi";
import type { Client } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { IconButton } from "../../components/ui/IconButton";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { getApiErrorMessage } from "../../lib/errors";
import { maskCpfInput, maskPhoneInput } from "../../lib/formatters";

const fieldClass =
  "min-h-12 w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3.5 py-2.5 text-base text-[#23372a] font-normal focus-visible:outline-2 focus-visible:outline-[#2f6840]";

export function ClientRegistrationModal({
  initialName = "",
  editingClient = null,
  onClose,
  onSaved,
}: {
  initialName?: string;
  editingClient?: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}) {
  const [name, setName] = useState(editingClient?.name ?? initialName);
  const [phone, setPhone] = useState(
    editingClient?.phone ? maskPhoneInput(editingClient.phone) : "",
  );
  const [email, setEmail] = useState(editingClient?.email ?? "");
  const [cpf, setCpf] = useState(
    editingClient?.cpf ? maskCpfInput(editingClient.cpf) : "",
  );
  const [notes, setNotes] = useState(editingClient?.notes ?? "");
  const [showExtraFields, setShowExtraFields] = useState(
    Boolean(
      editingClient?.email || editingClient?.cpf || editingClient?.notes,
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const cpfDigits = cpf.replace(/\D/g, "");
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("Informe um telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setError("O CPF deve conter exatamente 11 dígitos.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        phone: phoneDigits,
        email: trimmedEmail ? trimmedEmail : null,
        cpf: cpfDigits ? cpfDigits : null,
        notes: notes.trim() ? notes.trim() : null,
      };

      const savedClient = editingClient
        ? await updateClient(editingClient.id, payload)
        : await createClient(payload);

      onSaved(savedClient);
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(
          cause,
          editingClient
            ? "Não foi possível atualizar o cliente."
            : "Não foi possível cadastrar o cliente.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalOverlay
      disabled={submitting}
      maxWidthClass="max-w-[30rem]"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8eee9] px-5 pt-4 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ea] text-[#2f6840]">
            <UserPlus size={20} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-[#4a7957] uppercase">
              {editingClient ? "Editar cadastro" : "Cadastro rápido"}
            </p>
            <h2 className="m-0 truncate text-lg font-bold text-[#17211b]">
              {editingClient ? editingClient.name : "Novo Cliente"}
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
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="grid flex-1 content-start gap-3.5 overflow-y-auto px-5 py-4">
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Nome do cliente *
            <input
              autoFocus
              className={fieldClass}
              maxLength={120}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex.: João Pedro"
              required
              type="text"
              value={name}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Telefone / WhatsApp *
            <input
              className={fieldClass}
              inputMode="tel"
              onChange={(event) => {
                setPhone(maskPhoneInput(event.target.value));
                if (error) setError(null);
              }}
              placeholder="(11) 99999-9999"
              required
              type="tel"
              value={phone}
            />
            <span className="text-xs font-normal text-[#617067]">
              Apenas nome e telefone são obrigatórios agora.
            </span>
          </label>

          <button
            className="flex min-h-11 items-center justify-between rounded-[0.65rem] border border-[#dce5dd] bg-[#f5f7f4] px-3.5 py-2 text-left text-xs font-bold text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea]"
            onClick={() => setShowExtraFields((prev) => !prev)}
            type="button"
          >
            <span>
              {showExtraFields
                ? "Ocultar CPF, E-mail e Observações"
                : "Adicionar CPF, E-mail ou Observações (opcional)"}
            </span>
            {showExtraFields ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          <AnimatePresence initial={false}>
            {showExtraFields && (
              <m.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="grid gap-3 rounded-xl border border-[#dce5dd] bg-[#f5f7f4] p-3.5">
                  <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
                    E-mail (para pacote mensal)
                    <input
                      className={fieldClass}
                      inputMode="email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="cliente@email.com"
                      type="email"
                      value={email}
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
                    CPF (para pacote mensal)
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      onChange={(event) => {
                        setCpf(maskCpfInput(event.target.value));
                        if (error) setError(null);
                      }}
                      placeholder="000.000.000-00"
                      type="text"
                      value={cpf}
                    />
                  </label>

                  <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
                    Observações
                    <textarea
                      className="w-full rounded-[0.65rem] border border-[#c8d6ca] bg-white px-3.5 py-2 text-sm font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                      maxLength={400}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Preferências de corte, observações..."
                      rows={2}
                      value={notes}
                    />
                  </label>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {error && (
            <FeedbackMessage
              message={error}
              onClose={() => setError(null)}
              variant="error"
            />
          )}
        </div>

        <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2.5 border-t border-[#e8eee9] bg-white px-5 pt-3 pb-4">
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
            {submitting
              ? "Salvando..."
              : editingClient
                ? "Salvar alterações"
                : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
