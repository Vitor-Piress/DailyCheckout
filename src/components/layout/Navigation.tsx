import { LayoutDashboard, Scissors } from "lucide-react";
import { NavLink } from "react-router-dom";

export function Navigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 border-t border-[#dce5dd] bg-white/95 p-2 shadow-[0_-0.5rem_1.5rem_rgb(23_33_27/6%)] backdrop-blur-xl sm:flex sm:justify-center sm:gap-2 sm:px-4 sm:py-3"
    >
      <NavLink
        className={({ isActive }) =>
          `flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
            isActive ? "bg-[#e8f2ea] text-[#2f6840]" : "text-[#617067]"
          } sm:min-w-36`
        }
        end
        to="/"
      >
        <Scissors size={20} />
        <span>Operação</span>
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
            isActive ? "bg-[#e8f2ea] text-[#2f6840]" : "text-[#617067]"
          } sm:min-w-36`
        }
        to="/gestao"
      >
        <LayoutDashboard size={20} />
        <span>Gestão</span>
      </NavLink>
    </nav>
  );
}
