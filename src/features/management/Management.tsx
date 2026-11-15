import { BarChart3, CalendarCheck, Receipt, RefreshCw } from "lucide-react";
import { LayoutGroup } from "motion/react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { isAdmin } from "../../auth/roles";
import { Button } from "../../components/ui/Button";
import {
  NavActivePill,
  NavAnimatedIcon,
} from "../../components/ui/NavActivePill";
import type { ManagementOutletContext } from "./managementContext";

const adminNavItems = [
  {
    to: "/gestao/diario",
    label: "Diário",
    icon: CalendarCheck,
  },
  {
    to: "/gestao/despesas",
    label: "Despesas",
    icon: Receipt,
  },
  {
    to: "/gestao/relatorios",
    label: "Relatórios",
    icon: BarChart3,
  },
] as const;

export function Management() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { role } = useAuth();
  const location = useLocation();
  const showAdminNav = isAdmin(role);

  function refreshManagement() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshToken((current) => current + 1);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <section className="grid min-w-0 gap-5 sm:gap-6">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#4a7957]">
            Acompanhamento
          </p>
          <h1 className="mb-1.5 text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-[-0.04em]">
            Gestão
          </h1>
          <p className="m-0 max-w-[34rem] text-sm text-[#617067] sm:text-base">
            Consulte os registros e acompanhe os resultados do negócio.
          </p>
        </div>
        <Button
          aria-label="Atualizar dados da Gestão"
          className="!min-h-11 h-11 flex shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap shadow-[0_0.25rem_0.75rem_rgb(47_104_64/18%)] sm:px-3.5 sm:text-sm"
          disabled={refreshing}
          onClick={refreshManagement}
          title="Atualizar dados"
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={refreshing ? "animate-spin" : ""}
            size={18}
          />
          <span>Atualizar</span>
        </Button>
      </div>

      {showAdminNav && (
        <LayoutGroup id="management-sub-navigation">
          <nav
            aria-label="Seções da gestão"
            className="grid min-w-0 grid-cols-3 gap-1.5 rounded-2xl border border-[#dce5dd] bg-white p-1.5 shadow-[0_0.35rem_1rem_rgb(23_33_27/4%)]"
          >
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  className={({ isActive }) =>
                    `group relative flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1.5 py-2 text-[11px] leading-tight font-bold transition-colors duration-200 select-none min-[375px]:px-2.5 min-[375px]:text-xs sm:text-sm ${
                      isActive
                        ? "text-[#2f6840]"
                        : "text-[#617067] hover:bg-[#f5f7f4]/80 hover:text-[#2f6840]"
                    }`
                  }
                  key={item.to}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <NavActivePill layoutId="management-nav" />
                      )}
                      <span className="relative z-10 flex min-w-0 flex-col items-center justify-center gap-0.5 transition-transform duration-150 group-active:scale-[0.97] min-[375px]:flex-row min-[375px]:gap-1.5">
                        <NavAnimatedIcon isActive={isActive}>
                          <Icon
                            aria-hidden="true"
                            size={16}
                            strokeWidth={isActive ? 2.2 : 1.9}
                          />
                        </NavAnimatedIcon>
                        <span className="truncate">{item.label}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </LayoutGroup>
      )}

      <div className="motion-content min-w-0" key={location.pathname}>
        <Outlet context={{ refreshToken } satisfies ManagementOutletContext} />
      </div>
    </section>
  );
}
