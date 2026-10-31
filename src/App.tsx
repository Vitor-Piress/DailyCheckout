import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Scissors,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
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

      <div className="empty-panel">
        <Scissors size={28} aria-hidden="true" />
        <h2>Serviços disponíveis em breve</h2>
        <p>
          A operação diária será conectada à API na próxima etapa. Aqui ficarão
          os botões rápidos para registrar cada serviço.
        </p>
      </div>
    </section>
  );
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
