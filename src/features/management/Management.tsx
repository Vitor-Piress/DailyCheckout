import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { DailyManagement } from "./DailyManagement";
import { ExpenseManagement } from "./ExpenseManagement";
import { PeriodicManagement } from "./PeriodicManagement";

export function Management() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function refreshManagement() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshToken((current) => current + 1);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">Acompanhamento</p>
          <h1 className="mb-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">Gestão</h1>
          <p className="m-0 max-w-[34rem] text-[#617067]">Consulte os registros e acompanhe os resultados do negócio.</p>
        </div>
        <Button aria-label="Atualizar dados da Gestão" className="flex shrink-0 items-center gap-1.5 px-3.5 text-sm shadow-[0_0.25rem_0.75rem_rgb(47_104_64/18%)]" disabled={refreshing} onClick={refreshManagement} title="Atualizar dados" type="button">
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={22} />
          <span>Atualizar</span>
        </Button>
      </div>
      <DailyManagement refreshToken={refreshToken} />
      <ExpenseManagement refreshToken={refreshToken} />
      <PeriodicManagement refreshToken={refreshToken} />
    </section>
  );
}
