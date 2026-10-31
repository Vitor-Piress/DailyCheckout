import { request } from "./client";
import type {
  CreateExpenseInput,
  CreateServiceRecordInput,
  DailyReport,
  Expense,
  Period,
  PeriodicReport,
  ServiceRecord,
  ServiceType,
} from "./types";

function dateQuery(date: string): string {
  return `?date=${encodeURIComponent(date)}`;
}

export function listServiceTypes(): Promise<ServiceType[]> {
  return request<ServiceType[]>("/service-types");
}

export function createServiceRecord(
  input: CreateServiceRecordInput,
): Promise<ServiceRecord> {
  return request<ServiceRecord>("/service-records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function listServiceRecords(date: string): Promise<ServiceRecord[]> {
  return request<ServiceRecord[]>(`/service-records${dateQuery(date)}`);
}

export function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return request<Expense>("/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function listExpenses(date: string): Promise<Expense[]> {
  return request<Expense[]>(`/expenses${dateQuery(date)}`);
}

export function getDailyReport(date: string): Promise<DailyReport> {
  return request<DailyReport>(`/reports/daily${dateQuery(date)}`);
}

export function getPeriodicReport(
  period: Period,
  date: string,
): Promise<PeriodicReport> {
  const params = new URLSearchParams({ period, date });
  return request<PeriodicReport>(`/reports/periodic?${params.toString()}`);
}
