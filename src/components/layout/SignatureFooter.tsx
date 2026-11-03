export function SignatureFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`no-print select-none text-center text-[11px] font-medium tracking-[0.02em] text-[#617067]/75 ${className}`}
    >
      © Vitor Pires 2026
    </footer>
  );
}

