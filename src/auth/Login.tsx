import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { FeedbackMessage } from "../components/ui/FeedbackMessage";
import { Panel } from "../components/ui/Panel";
import { authClient } from "./authClient";
import { useAuth } from "./authContext";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    loading: sessionLoading,
    user,
    sessionMessage,
    clearSessionMessage,
    refreshSession,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!sessionLoading && user) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate replace to={from ?? "/"} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.");
        return;
      }

      if (!data) {
        setError("Não foi possível concluir o login. Tente novamente.");
        return;
      }

      await refreshSession();
      setSuccess("Login concluído. Carregando a aplicação...");
      navigate("/", { replace: true });
    } catch (cause: unknown) {
      console.error("Não foi possível fazer login:", cause);
      setError(
        cause instanceof Error
          ? `Não foi possível fazer login: ${cause.message}`
          : "Não foi possível conectar ao serviço de autenticação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="motion-page mx-auto grid min-h-dvh w-full max-w-[28rem] content-center gap-5 px-5 py-8 sm:px-6">
      <div className="px-0.5">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
          DailyCheckout
        </p>
        <h1 className="mb-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
          Entrar
        </h1>
        <p className="m-0 text-sm text-[#617067] sm:text-base">
          Acesse sua gestão da barbearia.
        </p>
      </div>
      <Panel className="p-4 sm:p-5">
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            E-mail
            <input
              autoComplete="email"
              className="min-h-11 w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-base font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840] sm:text-sm"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
            Senha
            <input
              autoComplete="current-password"
              className="min-h-11 w-full rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 text-base font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840] sm:text-sm"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {sessionMessage && (
            <FeedbackMessage message={sessionMessage} onClose={clearSessionMessage} variant="error" />
          )}
          {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
          {success && <FeedbackMessage message={success} onClose={() => setSuccess(null)} />}
          <Button disabled={submitting} type="submit">
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
          <button
            className="min-h-10 rounded-lg px-2 py-1.5 text-sm font-bold text-[#2f6840] underline underline-offset-2 transition hover:bg-[#f5f7f4]"
            onClick={() => navigate("/auth/forgot-password")}
            type="button"
          >
            Esqueci minha senha
          </button>
        </form>
      </Panel>
    </section>
  );
}
