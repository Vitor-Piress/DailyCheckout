import { LayoutDashboard, Scissors, Users } from "lucide-react";
import { LayoutGroup } from "motion/react";
import { NavLink } from "react-router-dom";
import { NavActivePill, NavAnimatedIcon } from "../ui/NavActivePill";

const navItems = [
  { to: "/", label: "Operação", icon: Scissors, end: true },
  { to: "/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/gestao", label: "Gestão", icon: LayoutDashboard, end: false },
] as const;

export function Navigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-[#dce5dd] bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-0.5rem_1.5rem_rgb(23_33_27/6%)] backdrop-blur-xl sm:px-4 sm:pt-2.5 sm:pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
    >
      <LayoutGroup id="bottom-navigation">
        <div className="mx-auto grid max-w-[30rem] grid-cols-3 gap-1.5 sm:flex sm:max-w-none sm:justify-center sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                className={({ isActive }) =>
                  `group relative flex min-h-12 items-center justify-center rounded-xl px-2 text-xs font-bold transition-colors duration-200 select-none sm:min-w-36 ${
                    isActive
                      ? "text-[#2f6840]"
                      : "text-[#617067] hover:bg-[#f5f7f4]/80 hover:text-[#2f6840]"
                  }`
                }
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <NavActivePill layoutId="bottom-nav" />}
                    <span className="relative z-10 flex items-center justify-center gap-1.5 transition-transform duration-150 group-active:scale-[0.97]">
                      <NavAnimatedIcon isActive={isActive}>
                        <Icon
                          aria-hidden="true"
                          size={20}
                          strokeWidth={isActive ? 2.2 : 1.9}
                        />
                      </NavAnimatedIcon>
                      <span>{item.label}</span>
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
