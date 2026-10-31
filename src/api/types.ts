export type PaymentMethod =
  | "cash"
  | "pix"
  | "credit_card"
  | "debit_card"
  | "other";

export type Period = "month" | "quarter" | "semester" | "year";

export type ServiceType = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
};

export type CreateServiceRecordInput = {
  serviceTypeId: string;
  paymentMethod: PaymentMethod;
  occurredAt?: string;
  notes?: string;
};

export type ServiceRecord = {
  id: string;
  serviceTypeId: string;
  serviceName?: string;
  priceCents: number;
  paymentMethod: PaymentMethod;
  occurredAt: string;
  notes?: string | null;
  createdAt: string;
};

export type CreateExpenseInput = {
  description: string;
  amountCents: number;
  category?: string;
  paymentMethod: PaymentMethod;
  occurredAt?: string;
  notes?: string;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category?: string | null;
  paymentMethod: PaymentMethod;
  occurredAt: string;
  notes?: string | null;
  createdAt: string;
};

export type ServiceSummary = {
  serviceTypeId: string;
  serviceName: string;
  quantity: number;
  totalCents: number;
};

export type PaymentSummary = {
  paymentMethod: PaymentMethod;
  quantity: number;
  totalCents: number;
};

export type DailyReport = {
  date: string;
  services: ServiceSummary[];
  paymentMethods: PaymentSummary[];
  serviceCount: number;
  grossRevenueCents: number;
};

export type PeriodicReport = {
  period: Period;
  startDate: string;
  endDate: string;
  serviceCount: number;
  grossRevenueCents: number;
  expenseCount: number;
  expensesCents: number;
  netRevenueCents: number;
  expensesByPaymentMethod: PaymentSummary[];
};
