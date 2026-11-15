import { Accessibility } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Button } from "../ui/Button";
import { Navigation } from "./Navigation";
import { SignatureFooter } from "./SignatureFooter";
import { TopApiProgressBar } from "./TopApiProgressBar";
import { useMotionPreference } from "../../ui/motion";

const logo = "/favicon.svg";

export function AppShell({ children }: { children?: ReactNode }) {
  const { signOut, user } = useAuth();
  const { animationsEnabled, toggleAnimations } = useMotionPreference();
  const location = useLocation();
  const pageTransitionKey = location.pathname.startsWith("/gestao")
    ? "/gestao"
    : location.pathname;

  return (
    <div className="flex min-h-screen flex-col">
      <TopApiProgressBar />
      <header className="flex items-center justify-between gap-4 bg-[#17211b] px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-[#f5f7f4] sm:px-8 sm:pb-5 sm:pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5 text-[1.05rem] font-bold tracking-tight">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[#b6d7bd] bg-transparent">
            <img
              src={logo}
              alt="Logo da barbearia"
              className="h-7 w-7 object-contain"
              height="28"
              width="28"
            />
          </div>
          <span>Bem-vindo, {user?.name ?? user?.email ?? "usuário"}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button
            aria-pressed={animationsEnabled}
            className="flex min-h-9 items-center gap-1.5 bg-transparent px-2 text-xs text-[#b8c5bb] shadow-none hover:bg-white/10 sm:px-2.5"
            onClick={toggleAnimations}
            title={
              animationsEnabled
                ? "Desativar animações"
                : "Ativar animações"
            }
            type="button"
          >
            <Accessibility size={16} />
            <span className="hidden sm:inline">
              {animationsEnabled ? "Animações ativadas" : "Animações desativadas"}
            </span>
            <span className="sr-only">
              {animationsEnabled ? "Animações ativadas" : "Animações desativadas"}
            </span>
          </Button>
          <Button
            className="min-h-9 bg-transparent px-2.5 text-xs text-[#b8c5bb] shadow-none hover:bg-white/10"
            onClick={() => void signOut()}
            type="button"
          >
            Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[70rem] flex-1 flex-col px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-10 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <div className="motion-page flex-1" key={pageTransitionKey}>
          {children ?? <Outlet />}
        </div>
        <SignatureFooter className="mt-10 pt-2" />
      </main>
      <Navigation />
    </div>
  );
}
