import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";

type Todo = {
  id?: string | number;
  name?: string;
  title?: string;
  created_at?: string;
  [column: string]: unknown;
};

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getTodos() {
      setLoading(true);
      setError(null);

      const { data: todos, error } = await supabase
        .from("fechamento")
        .select("*")
        .returns<Todo[]>();

      if (error) {
        console.error("Não foi possível carregar os todos do Supabase:", error);
        setError(`${error.message}${error.code ? ` (código ${error.code})` : ""}`);
        setLoading(false);
        return;
      }

      setTodos(todos ?? []);
      setLoading(false);
    }

    void getTodos().catch((cause: unknown) => {
      console.error("Falha ao conectar ao Supabase:", cause);
      setError(
        cause instanceof Error ? cause.message : "Erro inesperado ao conectar ao Supabase.",
      );
      setLoading(false);
    });
  }, []);

  return (
    <main>
      <h1>Fechamento</h1>
      {loading && <p>Carregando registros do Supabase...</p>}
      {error && <p role="alert">Erro ao carregar registros: {error}</p>}
      {!loading && !error && todos.length === 0 && (
        <p>
          Consulta concluída, mas a tabela <code>fechamento</code> não retornou
          registros. Verifique se o item está no projeto certo e se as políticas
          RLS permitem a leitura.
        </p>
      )}
      <ul>
        {todos.map((todo, index) => (
          <li key={todo.id ?? `${todo.created_at ?? "registro"}-${index}`}>
            {todo.name ?? todo.title ?? todo.created_at ?? (
              <pre>{JSON.stringify(todo, null, 2)}</pre>
            )}
          </li>
        ))}
      </ul>
      {!loading && !error && todos.length > 0 && (
        <p>Supabase conectado: {todos.length} registro(s) recebido(s).</p>
      )}
    </main>
  );
}
