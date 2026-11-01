import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { FeedbackMessage } from "../components/ui/FeedbackMessage";
import { Panel } from "../components/ui/Panel";
import { authClient } from "./authClient";
import { useAuth } from "./authContext";

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: sessionLoading, user } = useAuth();
  const token = new URLSearchParams(location.search).get("token");
  const recoveryError = new URLSearchParams(location.search).get("error");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(getRecoveryErrorMessage(recoveryError));
  const [success, setSuccess] = useState(false);

  if (!sessionLoading && user) {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("O link de recuperação é inválido ou está incompleto.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(getResetErrorMessage(resetError));
        return;
      }

      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch (cause: unknown) {
      console.error("Não foi possível redefinir a senha:", cause);
      setError(
        cause instanceof Error
          ? `Não foi possível definir a senha: ${cause.message}`
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
          Definir nova senha
        </h1>
        <p className="m-0 text-[#617067]">Escolha uma senha para acessar sua conta.</p>
      </div>
      <Panel>
        {success ? (
          <div className="grid gap-4">
            <FeedbackMessage
              message="Senha definida com sucesso. Agora você já pode entrar com seu e-mail e sua nova senha."
              onClose={() => setSuccess(false)}
            />
            <Button onClick={() => navigate("/login", { replace: true })} type="button">
              Ir para o login
            </Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
              Nova senha
              <input
                autoComplete="new-password"
                className="min-h-11 rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-[#34443a]">
              Confirmar nova senha
              <input
                autoComplete="new-password"
                className="min-h-11 rounded-[0.55rem] border border-[#c8d6ca] bg-white px-3 py-2 font-normal text-[#23372a] focus-visible:outline-2 focus-visible:outline-[#2f6840]"
                minLength={8}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </label>
            {error && <FeedbackMessage message={error} onClose={() => setError(null)} variant="error" />}
            <Button disabled={submitting || !token} type="submit">
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Panel>
    </section>
  );
}

function getRecoveryErrorMessage(error: string | null) {
  if (!error) return null;
  if (error === "INVALID_TOKEN") {
    return "Este link de recuperação é inválido ou expirou. Solicite um novo link.";
  }
  return "Não foi possível validar o link de recuperação. Solicite um novo link.";
}

function getResetErrorMessage(error: { message?: string; code?: string }) {
  if (error.code === "INVALID_TOKEN") {
    return "Este link de recuperação é inválido ou expirou. Solicite um novo link.";
  }
  if (error.code === "PASSWORD_TOO_SHORT" || error.code === "INVALID_PASSWORD") {
    return "A senha não atende aos requisitos do Neon Auth. Escolha uma senha mais forte.";
  }
  return error.message || "Não foi possível definir a nova senha.";
}
