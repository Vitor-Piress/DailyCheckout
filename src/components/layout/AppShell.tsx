import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import { Navigation } from "./Navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 bg-[#17211b] px-5 py-4 text-[#f5f7f4] sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5 text-[1.05rem] font-bold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-[0.65rem] bg-[#b6d7bd] text-[#17211b]">
            <Scissors size={22} />
          </div>
          <span>DailyCheckout</span>
        </div>
        <p className="m-0 text-xs text-[#b8c5bb]">Gestão da barbearia</p>
      </header>
      <main className="mx-auto w-full max-w-[70rem] flex-1 px-4 py-6 pb-26 sm:px-8 sm:py-10 sm:pb-26">
        {children}
      </main>
      <Navigation />
    </div>
  );
}
