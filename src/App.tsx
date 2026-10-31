import { type FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  Scissors,
  X,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  createExpense,
  createServiceRecord,
  getDailyReport,
  getPeriodicReport,
  listServiceTypes,
  listServiceRecords,
  listExpenses,
} from "./api/dailyCheckoutApi";
import { ApiError } from "./api/client";
import type {
  DailyReport,
  Expense,
  PaymentMethod,
  Period,
  PeriodicReport,
  ServiceRecord,
  ServiceType,
} from "./api/types";

function Navigation() {
  return (
    <nav className="app-nav" aria-label="Navegação principal">
      <NavLink
        className={({ isActive }) =>
          `nav-link${isActive ? " nav-link-active" : ""}`
        }
        to="/"
        end
      >
        <Scissors size={20} aria-hidden="true" />
        <span>Operação</span>
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `nav-link${isActive ? " nav-link-active" : ""}`
        }
        to="/gestao"
      >
        <LayoutDashboard size={20} aria-hidden="true" />
        <span>Gestão</span>
      </NavLink>
    </nav>
  );
}

function DismissibleMessage({
  message,
  onClose,
  variant = "success",
}: {
  message: string;
  onClose: () => void;
  variant?: "success" | "error";
}) {
  const isError = variant === "error";

  return (
    <div
      className={`feedback-message feedback-${variant}`}
      role={isError ? "alert" : "status"}
    >
      {isError ? (
        <AlertCircle size={18} aria-hidden="true" />
      ) : (
        <CheckCircle2 size={18} aria-hidden="true" />
      )}
      <span>{message}</span>
      <button
        aria-label="Fechar aviso"
        className="feedback-close"
        onClick={onClose}
        type="button"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function DailyOperation() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void listServiceTypes()
      .then(setServices)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar os serviços:", cause);
        setError(
          getApiErrorMessage(cause, "Não foi possível carregar os serviços."),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function chooseService(service: ServiceType) {
    setSelectedService(service);
    setPaymentMethod(null);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedService || !paymentMethod || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createServiceRecord({
        serviceTypeId: selectedService.id,
        paymentMethod,
      });
      setSuccess(`${selectedService.name} registrado com sucesso.`);
      setSelectedService(null);
      setPaymentMethod(null);
    } catch (cause: unknown) {
      console.error("Não foi possível registrar o atendimento:", cause);
      setError(
        getApiErrorMessage(cause, "Não foi possível registrar o atendimento."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DailyCheckout</p>
          <h1>Operação diária</h1>
          <p className="page-description">
            Registre os serviços realizados durante o expediente.
          </p>
        </div>
        <div className="date-badge">
          <CalendarDays size={18} aria-hidden="true" />
          <span>Hoje</span>
        </div>
      </div>

      {loading && (
        <div className="empty-panel">
          <p>Carregando serviços disponíveis...</p>
        </div>
      )}
      {!loading && error && (
        <div className="empty-panel status-error" role="alert">
          <AlertCircle size={28} aria-hidden="true" />
          <h2>Não foi possível carregar os serviços</h2>
          <p>{error}</p>
          <button
            aria-label="Fechar aviso"
            className="feedback-close"
            onClick={() => setError(null)}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {!loading && !error && services.length === 0 && (
        <div className="empty-panel">
          <Scissors size={28} aria-hidden="true" />
          <h2>Nenhum serviço disponível</h2>
          <p>
            Cadastre um serviço ativo para começar a registrar atendimentos.
          </p>
        </div>
      )}
      {!loading && !error && services.length > 0 && (
        <>
          <div className="service-grid" aria-label="Serviços disponíveis">
            {services.map((service) => (
              <button
                className={`service-button${
                  selectedService?.id === service.id
                    ? " service-button-selected"
                    : ""
                }`}
                key={service.id}
                onClick={() => chooseService(service)}
                type="button"
              >
                <span>{service.name}</span>
                {service.description && <small>{service.description}</small>}
              </button>
            ))}
          </div>

          {selectedService && (
            <div className="checkout-panel">
              <div>
                <p className="eyebrow">Registrar atendimento</p>
                <h2>{selectedService.name}</h2>
              </div>
              <fieldset className="payment-options">
                <legend>Forma de pagamento</legend>
                {paymentOptions.map((option) => (
                  <label className="payment-option" key={option.value}>
                    <input
                      checked={paymentMethod === option.value}
                      name="payment-method"
                      onChange={() => setPaymentMethod(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <button
                className="primary-button"
                disabled={!paymentMethod || submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Registrando..." : "Confirmar atendimento"}
              </button>
            </div>
          )}
        </>
      )}
      {success && (
        <DismissibleMessage
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}
    </section>
  );
}

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "other", label: "Outro" },
];

function getApiErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    return cause.message;
  }

  return cause instanceof Error ? cause.message : fallback;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function getToday(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function paymentMethodLabel(paymentMethod: PaymentMethod): string {
  return (
    paymentOptions.find((option) => option.value === paymentMethod)?.label ??
    paymentMethod
  );
}

function DailyManagement({ refreshToken }: { refreshToken: number }) {
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
        console.error(
          "Não foi possível carregar o acompanhamento diário:",
          cause,
        );
        setError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar os dados do dia.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [date, refreshToken]);

  return (
    <div className="daily-management">
      <div className="date-filter">
        <label htmlFor="report-date">Data do acompanhamento</label>
        <input
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

      {loading && <p className="status-message">Carregando dados do dia...</p>}
      {error && (
        <DismissibleMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}
      {!loading && !error && report && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Atendimentos</span>
              <strong>{report.serviceCount}</strong>
            </div>
            <div className="metric-card">
              <span>Receita bruta</span>
              <strong>{formatCurrency(report.grossRevenueCents)}</strong>
            </div>
          </div>

          <div className="report-grid">
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

          <div className="records-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Atendimentos realizados</p>
                <h2>Registros do dia</h2>
              </div>
              <ClipboardList size={24} aria-hidden="true" />
            </div>
            {records.length === 0 ? (
              <p className="status-message">Nenhum atendimento nesta data.</p>
            ) : (
              <ul className="record-list">
                {records.map((record) => (
                  <li key={record.id}>
                    <strong>{record.serviceName ?? "Serviço"}</strong>
                    <span>{paymentMethodLabel(record.paymentMethod)}</span>
                    <b>{formatCurrency(record.priceCents)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReportList({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: Array<{ label: string; detail: string; value: string }>;
  title: string;
}) {
  return (
    <div className="report-panel">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="status-message">{emptyMessage}</p>
      ) : (
        <ul className="summary-list">
          {items.map((item) => (
            <li key={item.label}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <b>{item.value}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseManagement({ refreshToken }: { refreshToken: number }) {
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

  useEffect(() => {
    void listExpenses(date)
      .then(setExpenses)
      .catch((cause: unknown) => {
        console.error("Não foi possível carregar as despesas:", cause);
        setError(
          getApiErrorMessage(cause, "Não foi possível carregar as despesas."),
        );
      })
      .finally(() => setLoading(false));
  }, [date, refreshToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);

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
    <div className="expenses-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Controle financeiro</p>
          <h2>Despesas</h2>
        </div>
        <ClipboardList size={24} aria-hidden="true" />
      </div>

      <form
        className="expense-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label>
          Data
          <input
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
        <label>
          Descrição
          <input
            maxLength={200}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: produtos de limpeza"
            required
            type="text"
            value={description}
          />
        </label>
        <label>
          Valor (R$)
          <input
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
        <label>
          Categoria (opcional)
          <input
            maxLength={100}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Ex.: materiais"
            type="text"
            value={category}
          />
        </label>
        <label>
          Forma de pagamento
          <select
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
            value={paymentMethod}
          >
            {paymentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Observações (opcional)
          <textarea
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Detalhes adicionais"
            rows={3}
            value={notes}
          />
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Lançando..." : "Lançar despesa"}
        </button>
      </form>

      {success && (
        <DismissibleMessage
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}
      {error && (
        <DismissibleMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}
      {loading && <p className="status-message">Carregando despesas...</p>}
      {!loading && !error && expenses.length === 0 && (
        <p className="status-message">Nenhuma despesa lançada nesta data.</p>
      )}
      {!loading && expenses.length > 0 && (
        <ul className="expense-list">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <span>
                <strong>{expense.description}</strong>
                <small>
                  {paymentMethodLabel(expense.paymentMethod)}
                  {expense.category ? ` · ${expense.category}` : ""}
                </small>
              </span>
              <b>{formatCurrency(expense.amountCents)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: "month", label: "Mês" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Ano" },
];

function PeriodicManagement({ refreshToken }: { refreshToken: number }) {
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(getToday);
  const [report, setReport] = useState<PeriodicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPeriodicReport(period, date)
      .then(setReport)
      .catch((cause: unknown) => {
        console.error(
          "Não foi possível carregar o relatório periódico:",
          cause,
        );
        setError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar o relatório periódico.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [date, period, refreshToken]);

  function changePeriod(nextPeriod: Period) {
    setLoading(true);
    setError(null);
    setPeriod(nextPeriod);
  }

  function changeDate(nextDate: string) {
    setLoading(true);
    setError(null);
    setDate(nextDate);
  }

  return (
    <div className="periodic-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Análise financeira</p>
          <h2>Relatório periódico</h2>
        </div>
        <BarChart3 size={24} aria-hidden="true" />
      </div>

      <div className="periodic-filters">
        <label>
          Período
          <select
            onChange={(event) => changePeriod(event.target.value as Period)}
            value={period}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data de referência
          <input
            max={getToday()}
            onChange={(event) => changeDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>

      {loading && (
        <p className="status-message">Carregando relatório periódico...</p>
      )}
      {error && (
        <DismissibleMessage
          message={error}
          onClose={() => setError(null)}
          variant="error"
        />
      )}
      {!loading && !error && report && (
        <>
          <p className="period-range">
            Período: {report.startDate} a {report.endDate}
          </p>
          <div className="metric-grid periodic-metrics">
            <div className="metric-card">
              <span>Receita bruta</span>
              <strong>{formatCurrency(report.grossRevenueCents)}</strong>
            </div>
            <div className="metric-card">
              <span>Despesas</span>
              <strong>{formatCurrency(report.expensesCents)}</strong>
            </div>
            <div className="metric-card">
              <span>Resultado líquido</span>
              <strong>{formatCurrency(report.netRevenueCents)}</strong>
            </div>
            <div className="metric-card">
              <span>Atendimentos</span>
              <strong>{report.serviceCount}</strong>
            </div>
          </div>

          <div className="report-panel">
            <h2>Despesas por forma de pagamento</h2>
            {report.expensesByPaymentMethod.length === 0 ? (
              <p className="status-message">
                Nenhuma despesa registrada neste período.
              </p>
            ) : (
              <ul className="summary-list">
                {report.expensesByPaymentMethod.map((payment) => (
                  <li key={payment.paymentMethod}>
                    <span>
                      <strong>
                        {paymentMethodLabel(payment.paymentMethod)}
                      </strong>
                      <small>{payment.quantity} despesa(s)</small>
                    </span>
                    <b>{formatCurrency(payment.totalCents)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Management() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function refreshManagement() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setRefreshToken((current) => current + 1);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acompanhamento</p>
          <h1>Gestão</h1>
          <p className="page-description">
            Consulte os registros e acompanhe os resultados do negócio.
          </p>
        </div>
        <button
          aria-label="Atualizar dados da Gestão"
          className={`cursor-pointer refresh-button${refreshing ? " refresh-button-loading" : ""}`}
          disabled={refreshing}
          onClick={refreshManagement}
          title="Atualizar dados"
          type="button"
        >
          <RefreshCw size={22} aria-hidden="true" />
          <span>Atualizar</span>
        </button>
      </div>

      <DailyManagement refreshToken={refreshToken} />
      <ExpenseManagement refreshToken={refreshToken} />
      <PeriodicManagement refreshToken={refreshToken} />
    </section>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Scissors size={22} />
          </div>
          <span>DailyCheckout</span>
        </div>
        <p className="header-caption">Gestão da barbearia</p>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<DailyOperation />} />
          <Route path="/gestao" element={<Management />} />
        </Routes>
      </main>

      <Navigation />
    </div>
  );
}
