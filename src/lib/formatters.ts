import type { ExpensePaymentMethod, PaymentMethod } from "../api/types";

export const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "other", label: "Outro" },
];

export const expensePaymentOptions: Array<{
  value: ExpensePaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "other", label: "Outro" },
];

export const periodOptions = [
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "quarter", label: "Trimestral" },
  { value: "semester", label: "Semestral" },
  { value: "year", label: "Anual" },
] as const;

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function formatIsoDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12, 0, 0));
}

export const monthOptions = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
] as const;

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function getToday(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function getCurrentMonth(): string {
  return getToday().slice(0, 7);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

export function paymentMethodLabel(
  paymentMethod: PaymentMethod | ExpensePaymentMethod,
): string {
  return (
    expensePaymentOptions.find((option) => option.value === paymentMethod)
      ?.label ?? paymentMethod
  );
}
