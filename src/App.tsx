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
  listServiceTypes,
} from "./api/dailyCheckoutApi";
import { ApiError } from "./api/client";
import type { PaymentMethod, ServiceType } from "./api/types";
import { supabase } from "./utils/supabase";

type Todo = {
  id?: string | number;
  name?: string;
  title?: string;
  created_at?: string;
  [column: string]: unknown;
};

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

function LegacyRecords() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getTodos() {
      setLoading(true);
      setError(null);

      const { data: records, error: queryError } = await supabase
        .from("fechamento")
        .select("*")
        .returns<Todo[]>();

      if (queryError) {
        console.error(
          "Não foi possível carregar os registros legados:",
          queryError,
        );
        setError(
          `${queryError.message}${
            queryError.code ? ` (código ${queryError.code})` : ""
          }`,
        );
        setLoading(false);
        return;
      }

      setTodos(records ?? []);
      setLoading(false);
    }

    void getTodos().catch((cause: unknown) => {
      console.error("Falha ao conectar ao Supabase:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Erro inesperado ao carregar os registros.",
      );
      setLoading(false);
    });
  }, []);

  return (
    <div className="legacy-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Consulta existente</p>
          <h2>Registros de fechamento</h2>
        </div>
        <ClipboardList size={24} aria-hidden="true" />
      </div>
      {loading && <p className="status-message">Carregando registros...</p>}
      {error && (
        <p className="status-message status-error" role="alert">
          Erro ao carregar registros: {error}
        </p>
      )}
      {!loading && !error && todos.length === 0 && (
        <p className="status-message">
          Nenhum registro encontrado na consulta atual.
        </p>
      )}
      {todos.length > 0 && (
        <ul className="record-list">
          {todos.map((todo, index) => (
            <li key={todo.id ?? `${todo.created_at ?? "registro"}-${index}`}>
              {todo.name ?? todo.title ?? todo.created_at ?? (
                <pre>{JSON.stringify(todo, null, 2)}</pre>
              )}
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

      <div className="management-grid">
        <div className="feature-card">
          <BarChart3 size={22} aria-hidden="true" />
          <h2>Relatórios</h2>
          <p>Os relatórios diário e periódico serão adicionados em breve.</p>
        </div>
        <div className="feature-card">
          <ClipboardList size={22} aria-hidden="true" />
          <h2>Despesas</h2>
          <p>O lançamento e a consulta de despesas ficarão nesta área.</p>
        </div>
      </div>

      <LegacyRecords />
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
