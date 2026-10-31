import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export function EmptyState({
  icon,
  title,
  children,
  onClose,
}: {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="relative grid justify-items-center gap-2.5 rounded-2xl border border-[#dce5dd] bg-white px-5 py-13 text-center text-[#4a7957] shadow-[0_0.5rem_1.5rem_rgb(23_33_27/5%)]">
      {icon}
      {title && <h2 className="m-0 text-base leading-tight">{title}</h2>}
      <p className="m-0 max-w-[30rem] text-[#617067]">{children}</p>
      {onClose && (
        <IconButton
          aria-label="Fechar aviso"
          className="absolute right-3 top-3 h-8 w-8 rounded-[0.45rem] border-0 bg-transparent hover:bg-black/10"
          icon={<X size={18} />}
          onClick={onClose}
          type="button"
        />
      )}
    </div>
  );
}
