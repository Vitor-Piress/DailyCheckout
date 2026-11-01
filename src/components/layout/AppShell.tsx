import { Accessibility } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Button } from "../ui/Button";
import { Navigation } from "./Navigation";
import logo from "../../../public/Original reconstruction — 32px favicon.svg";
import { useMotionPreference } from "../../ui/motion";

export function AppShell({ children }: { children?: ReactNode }) {
  const { signOut, user } = useAuth();
  const { animationsEnabled, toggleAnimations } = useMotionPreference();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 bg-[#17211b] px-5 py-4 text-[#f5f7f4] sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5 text-[1.05rem] font-bold tracking-tight">
          <div className="flex items-center justify-center h-8 w-8 place-items-center border-dashed border border-[#b6d7bd] rounded-full bg-transparent text-[#17211b]">
            <img src={logo} alt="icon" className="h-8 w-8" />
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
      <main className="mx-auto w-full max-w-[70rem] flex-1 px-4 py-6 pb-26 sm:px-8 sm:py-10 sm:pb-26">
        <div className="motion-page" key={location.pathname}>
          {children ?? <Outlet />}
        </div>
      </main>
      <Navigation />
    </div>
  );
}
