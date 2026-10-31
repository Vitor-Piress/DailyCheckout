import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Scissors,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  createServiceRecord,
  getDailyReport,
  listServiceTypes,
  listServiceRecords,
} from "./api/dailyCheckoutApi";
import { ApiError } from "./api/client";
import type {
  DailyReport,
  PaymentMethod,
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
        setError(getApiErrorMessage(cause, "Não foi possível carregar os serviços."));
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
        </div>
      )}
      {!loading && !error && services.length === 0 && (
        <div className="empty-panel">
          <Scissors size={28} aria-hidden="true" />
          <h2>Nenhum serviço disponível</h2>
          <p>Cadastre um serviço ativo para começar a registrar atendimentos.</p>
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
                {service.description && (
                  <small>{service.description}</small>
                )}
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
        <p className="feedback-message feedback-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          {success}
        </p>
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

function DailyManagement() {
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
        setError(
          getApiErrorMessage(
            cause,
            "Não foi possível carregar os dados do dia.",
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [date]);

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
        <p className="status-message status-error" role="alert">
          {error}
        </p>
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

function Management() {
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
        <BarChart3 size={28} aria-hidden="true" />
      </div>

      <DailyManagement />
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
