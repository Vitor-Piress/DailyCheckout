import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { FeedbackMessage } from "../components/ui/FeedbackMessage";
import { Panel } from "../components/ui/Panel";
import { authClient } from "./authClient";
import { useAuth } from "./authContext";

export function ForgotPassword() {
  const navigate = useNavigate();
  const { loading: sessionLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionLoading && user) {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (requestError) {
        setError(getAuthErrorMessage(requestError));
        return;
      }

      setSent(true);
    } catch (cause: unknown) {
      console.error("Não foi possível solicitar a recuperação de senha:", cause);
      setError(
        cause instanceof Error
          ? `Não foi possível enviar o link: ${cause.message}`
          : "Não foi possível conectar ao serviço de autenticação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-9rem)] w-full max-w-[28rem] content-center gap-5">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
          DailyCheckout
        </p>
        <h1 className="mb-2 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
          Recuperar senha
        </h1>
        <p className="m-0 text-[#617067]">
          Informe seu e-mail para receber um link seguro de recuperação.
        </p>
      </div>
      <Panel>
        {sent ? (
          <div className="grid gap-4">
            <FeedbackMessage
              message="Se existir uma conta para este e-mail, enviaremos um link de recuperação. Verifique sua caixa de entrada."
              onClose={() => setSent(false)}
            />
            <Button onClick={() => navigate("/login")} type="button">
              Voltar para o login
            </Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
              E-mail
              <input
                autoComplete="email"
                className="min-h-11 rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
            <Button disabled={submitting} type="submit">
              {submitting ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <button
              className="text-sm font-bold text-[#2f6840] underline underline-offset-2"
              onClick={() => navigate("/login")}
              type="button"
            >
              Voltar para o login
            </button>
          </form>
        )}
      </Panel>
    </section>
  );
}

function getAuthErrorMessage(error: { message?: string; code?: string }) {
  if (error.code === "USER_NOT_FOUND") {
    return "Não encontramos uma conta com esse e-mail.";
  }

  return error.message || "Não foi possível solicitar a recuperação de senha.";
}
