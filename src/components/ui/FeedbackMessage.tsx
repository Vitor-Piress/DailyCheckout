import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { m } from "motion/react";
import { IconButton } from "./IconButton";

export function FeedbackMessage({
  message,
  onClose,
  variant = "success",
}: {
  message: string;
  onClose: () => void;
  variant?: "success" | "error";
}) {
  const isError = variant === "error";
  return (
    <m.div
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 rounded-[0.7rem] p-3.5 text-sm font-bold sm:items-center ${
        isError ? "bg-[#fbeaea] text-[#a83e3e]" : "bg-[#e8f2ea] text-[#2f6840]"
      }`}
      initial={{ opacity: 0, y: -4 }}
      role={isError ? "alert" : "status"}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 shrink-0 sm:mt-0" size={18} />
      ) : (
        <CheckCircle2 className="mt-0.5 shrink-0 sm:mt-0" size={18} />
      )}
      <span className="min-w-0 flex-1 leading-snug">{message}</span>
      <IconButton
        aria-label="Fechar aviso"
        className="h-8 w-8 shrink-0 rounded-[0.45rem] border-0 bg-transparent hover:bg-black/10"
        icon={<X size={18} />}
        onClick={onClose}
        type="button"
      />
    </m.div>
  );
}
