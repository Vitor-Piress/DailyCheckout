import { AlertCircle, CheckCircle2, X } from "lucide-react";
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
    <div
      className={`flex items-center gap-2 rounded-[0.7rem] p-3.5 font-bold ${
        isError ? "bg-[#fbeaea] text-[#a83e3e]" : "bg-[#e8f2ea] text-[#2f6840]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span className="flex-1">{message}</span>
      <IconButton
        aria-label="Fechar aviso"
        className="h-8 w-8 rounded-[0.45rem] border-0 bg-transparent hover:bg-black/10"
        icon={<X size={18} />}
        onClick={onClose}
        type="button"
      />
    </div>
  );
}
