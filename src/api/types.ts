import type { UserRole } from "../auth/roles";

export type PaymentMethod =
  | "cash"
  | "pix"
  | "credit_card"
  | "debit_card"
  | "other";

export type Period = "week" | "month" | "quarter" | "semester" | "year";

export type UserProfile = {
  id: string;
  authUserId: string;
  name: string;
  role: UserRole;
};

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
  createdBy: ServiceRecordAuthor | null;
};

export type ServiceRecordAuthor = {
  id: string;
  name: string;
  role: UserRole;
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

export type UserServiceSummary = {
  serviceTypeId: string;
  serviceName: string;
  quantity: number;
  totalCents: number;
};

export type UserReportSummary = {
  userId: string | null;
  userName: string;
  role: UserRole | null;
  serviceCount: number;
  grossRevenueCents: number;
  services: UserServiceSummary[];
};

export type DailyReport = {
  date: string;
  services: ServiceSummary[];
  paymentMethods: PaymentSummary[];
  serviceCount: number;
  grossRevenueCents: number;
  users: UserReportSummary[];
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
  users: UserReportSummary[];
};
