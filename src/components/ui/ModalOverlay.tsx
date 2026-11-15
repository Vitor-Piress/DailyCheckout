import { m, useIsPresent } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

let openModalCount = 0;
let previousBodyOverflow = "";

export function ModalOverlay({
  children,
  onClose,
  disabled = false,
  maxWidthClass = "max-w-[34rem]",
  ariaLabelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  disabled?: boolean;
  maxWidthClass?: string;
  ariaLabelledBy?: string;
}) {
  const isPresent = useIsPresent();

  useEffect(() => {
    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModalCount += 1;

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !disabled && isPresent) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, disabled, isPresent]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <m.div
      animate={{ opacity: 1 }}
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 ${
        isPresent ? "" : "pointer-events-none"
      }`}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={(event) => {
        if (isPresent && !disabled && event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <m.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`flex max-h-[90dvh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-t-2xl border border-[#dce5dd] bg-white shadow-2xl sm:rounded-2xl`}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </m.div>
    </m.div>,
    document.body,
  );
}
