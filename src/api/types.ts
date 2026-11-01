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

export type SettlementOperator = {
  userId: string;
  userName: string;
  grossServicesCents: number;
  operatorShareCents: number;
  adminShareCents: number;
  serviceCount: number;
};

export type SettlementAdminSummary = {
  ownServicesCents: number;
  dailyOperatorsShareCents: number;
  totalDueCents: number;
};

export type SettlementDifferences = {
  adminTotalDueCents: number;
  dailyOperatorsTotalDueCents: number;
};

export type ClosedSettlement = {
  settlementId: string;
  status: "closed";
  closedAt: string | null;
  closedBy: { userId: string; userName: string } | null;
  admin: SettlementAdminSummary;
  dailyOperators: SettlementOperator[];
  dailyOperatorsTotalDueCents: number;
  grossServicesCents: number;
  unidentifiedServicesCents: number;
  unidentifiedServiceCount: number;
};

export type DailyReportSettlement = {
  calculationStatus: "open" | "calculated";
  persistenceStatus: "not_closed" | "closed";
  admin: SettlementAdminSummary;
  dailyOperators: SettlementOperator[];
  grossServicesCents: number;
  dailyOperatorsTotalDueCents: number;
  adminTotalDueCents: number;
  unidentifiedServicesCents: number;
  unidentifiedServiceCount: number;
  closedSettlement: ClosedSettlement | null;
  hasDifferenceFromCurrentCalculation: boolean;
  differences: SettlementDifferences | null;
};

export type SettlementDaySummary = {
  date: string;
  status: "open" | "closed";
  adminTotalDueCents: number;
  dailyOperatorsTotalDueCents: number;
};

export type PeriodicSettlement = {
  periodStartDate: string;
  periodEndDate: string;
  calculationMode: "daily_snapshots_and_open_days";
  adminOwnServicesCents: number;
  dailyOperatorsGrossServicesCents: number;
  dailyOperatorsShareCents: number;
  adminDailyOperatorsShareCents: number;
  adminTotalDueCents: number;
  dailyOperatorsTotalDueCents: number;
  unidentifiedServicesCents: number;
  unidentifiedServiceCount: number;
  dailyOperators: SettlementOperator[];
  days: SettlementDaySummary[];
  closedDaysCount: number;
  openDaysCount: number;
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
  settlement: DailyReportSettlement | null;
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
  settlement: PeriodicSettlement | null;
};
