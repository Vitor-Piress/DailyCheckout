import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "min-h-12 rounded-[0.7rem] bg-[#2f6840] px-4 py-3 font-bold text-white transition hover:bg-[#265a35] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
  secondary:
    "min-h-11 rounded-[0.7rem] border border-[#dce5dd] bg-[#f5f7f4] px-4 py-2 font-bold text-[#2f6840] transition hover:border-[#4a7957] hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
  ghost:
    "rounded-[0.7rem] px-3 py-2 font-bold text-[#2f6840] transition hover:bg-[#e8f2ea] focus-visible:outline-2 focus-visible:outline-[#2f6840] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
  danger:
    "min-h-11 rounded-[0.7rem] bg-[#a83e3e] px-4 py-2 font-bold text-white transition hover:bg-[#8e3434] focus-visible:outline-2 focus-visible:outline-[#a83e3e] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
