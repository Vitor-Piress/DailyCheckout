import type { PaymentMethod } from "../../api/types";
import { paymentOptions } from "../../lib/formatters";

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <fieldset className="grid gap-2 border-0 p-0">
      <legend className="mb-1 text-sm font-bold text-[#34443a]">
        Forma de pagamento
      </legend>
      {paymentOptions.map((option) => (
        <label
          className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[0.65rem] border p-2.5 text-[#34443a] ${
            value === option.value
              ? "border-[#4a7957] bg-[#e8f2ea]"
              : "border-[#dce5dd]"
          }`}
          key={option.value}
        >
          <input
            checked={value === option.value}
            className="accent-[#2f6840]"
            name="payment-method"
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
