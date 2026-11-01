import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { Button } from "../ui/Button";
import { Navigation } from "./Navigation";

export function AppShell({ children }: { children?: ReactNode }) {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 bg-[#17211b] px-5 py-4 text-[#f5f7f4] sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5 text-[1.05rem] font-bold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-[0.65rem] bg-[#b6d7bd] text-[#17211b]">
            <Scissors size={22} />
          </div>
          <span>Bem-vindo, {user?.name ?? user?.email ?? "usuário"}</span>
        </div>
        <div className="flex items-center gap-3">
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
        {children ?? <Outlet />}
      </main>
      <Navigation />
    </div>
  );
}
