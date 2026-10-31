import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({
  icon,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
}) {
  return (
    <button
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce5dd] bg-[#f5f7f4] text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
