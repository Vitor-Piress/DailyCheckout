import type { ComponentPropsWithRef } from "react";
import { formatCurrency, parseAtmCurrencyInput } from "../../lib/formatters";

function ensureCaretAtEnd(input: HTMLInputElement) {
  if (input.selectionStart === input.selectionEnd) {
    const length = input.value.length;
    try {
      input.setSelectionRange(length, length);
    } catch {
      // Ignore unsupported selection range
    }
  }
}

export function CurrencyInput({
  valueCents,
  onChangeCents,
  maxDigits = 9,
  onClick,
  onFocus,
  onKeyUp,
  ...props
}: Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "onChange" | "inputMode"
> & {
  valueCents: number;
  onChangeCents: (cents: number) => void;
  maxDigits?: number;
}) {
  return (
    <input
      {...props}
      autoComplete="off"
      inputMode="numeric"
      onChange={(event) => {
        onChangeCents(parseAtmCurrencyInput(event.target.value, maxDigits));
      }}
      onClick={(event) => {
        ensureCaretAtEnd(event.currentTarget);
        onClick?.(event);
      }}
      onFocus={(event) => {
        ensureCaretAtEnd(event.currentTarget);
        onFocus?.(event);
      }}
      onKeyUp={(event) => {
        ensureCaretAtEnd(event.currentTarget);
        onKeyUp?.(event);
      }}
      type="text"
      value={formatCurrency(valueCents)}
    />
  );
}
