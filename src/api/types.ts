import type { UserRole } from "../auth/roles";

export type PaymentMethod =
  | "cash"
  | "pix"
  | "credit_card"
  | "debit_card"
  | "other";

export type ExpensePaymentMethod =
  | "cash"
  | "pix"
  | "credit_card"
  | "debit_card"
  | "boleto"
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
  tipCents?: number;
  tipPaymentMethod?: PaymentMethod;
  occurredAt?: string;
  notes?: string;
};

export type ServiceRecord = {
  id: string;
  serviceTypeId: string;
  serviceName: string;
  priceCents: number;
  tipCents: number;
  totalCents: number;
  operatorShareCents: number;
  adminShareCents: number;
  paymentMethod: PaymentMethod;
  tipPaymentMethod: PaymentMethod | null;
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
  paymentMethod: ExpensePaymentMethod;
  dueDate: string;
  notes?: string;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category: string | null;
  paymentMethod: ExpensePaymentMethod;
  dueDate: string;
  notes: string | null;
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
  servicesCents: number;
  tipsCents: number;
  totalCents: number;
};

export type ExpensePaymentSummary = {
  paymentMethod: ExpensePaymentMethod;
  quantity: number;
  totalCents: number;
};

export type SettlementOperator = {
  userId: string;
  userName: string;
  grossServicesCents: number;
  tipsCents: number;
  operatorShareCents: number;
  adminShareCents: number;
  serviceCount: number;
};

export type SettlementAdminSummary = {
  ownServicesCents: number;
  tipsCents: number;
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
  dailyOperatorsTipsCents?: number;
  dailyOperatorsTotalDueCents: number;
  grossServicesCents: number;
  tipsCents?: number;
  unidentifiedServicesCents: number;
  unidentifiedServiceCount: number;
};

export type DailyReportSettlement = {
  calculationStatus: "open" | "calculated";
  persistenceStatus: "not_closed" | "closed";
  admin: SettlementAdminSummary;
  dailyOperators: SettlementOperator[];
  grossServicesCents: number;
  tipsCents: number;
  dailyOperatorsTipsCents: number;
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
  adminTipsCents?: number;
  dailyOperatorsGrossServicesCents: number;
  dailyOperatorsTipsCents?: number;
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

export type OperatorDailyShare = {
  userId: string;
  userName: string;
  serviceCount: number;
  grossServicesCents: number;
  tipsCents: number;
  grossRevenueCents: number;
  operatorShareCents: number;
  adminShareCents: number;
  sharePercentage: 50;
};

export type UserServiceSummary = {
  serviceTypeId: string;
  serviceName: string;
  quantity: number;
  totalCents: number;
  operatorShareCents?: number;
  adminShareCents?: number;
};

export type DailyUserServiceSummary = UserServiceSummary & {
  operatorShareCents: number;
  adminShareCents: number;
};

export type UserReportSummary = {
  userId: string | null;
  userName: string;
  role: UserRole | null;
  serviceCount: number;
  grossServicesCents?: number;
  tipsCents?: number;
  grossRevenueCents: number;
  operatorShareCents?: number;
  adminShareCents?: number;
  services: UserServiceSummary[];
};

export type DailyUserReportSummary = Omit<
  UserReportSummary,
  "services" | "grossServicesCents" | "tipsCents"
> & {
  grossServicesCents: number;
  tipsCents: number;
  operatorShareCents: number;
  adminShareCents: number;
  services: DailyUserServiceSummary[];
};

export type DailyReport = {
  date: string;
  services: ServiceSummary[];
  paymentMethods: PaymentSummary[];
  serviceCount: number;
  grossServicesCents: number;
  tipsCents: number;
  grossRevenueCents: number;
  operatorShare: OperatorDailyShare | null;
  users: DailyUserReportSummary[];
  settlement: DailyReportSettlement | null;
};

export type FlexibleOperatorSummary = {
  userId: string;
  userName: string;
  serviceCount: number;
  grossServicesCents: number;
  tipsCents: number;
  expenseCents: number;
  adminShareCents: number;
};

export type FlexibleOperatorsExpense = {
  totalCents: number;
  grossServicesCents: number;
  tipsCents: number;
  adminShareCents: number;
  serviceCount: number;
  isFlexible: boolean;
  operators: FlexibleOperatorSummary[];
};

export type PeriodicReport = {
  period: Period;
  startDate: string;
  endDate: string;
  serviceCount: number;
  grossServicesCents: number;
  tipsCents: number;
  grossRevenueCents: number;
  expenseCount: number;
  expensesCents: number;
  dailyOperatorsExpenseCents: number;
  dailyOperatorsExpense: FlexibleOperatorsExpense;
  totalExpensesCents: number;
  netRevenueCents: number;
  expensesByPaymentMethod: ExpensePaymentSummary[];
  users: UserReportSummary[];
  settlement: PeriodicSettlement | null;
};
