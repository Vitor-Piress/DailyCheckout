import { request } from "./client";
import type {
  CreateExpenseInput,
  CreateServiceRecordInput,
  DailyReport,
  DailySettlement,
  Expense,
  Period,
  PeriodicReport,
  ServiceRecord,
  ServiceType,
  UserProfile,
} from "./types";
import { isUserRole } from "../auth/roles";

export function getCurrentUserProfile(): Promise<UserProfile> {
  return request<unknown>(import.meta.env.VITE_PROFILE_PATH?.trim() || "/me").then(
    (profile): UserProfile => {
      if (
        typeof profile !== "object" ||
        profile === null ||
        !("role" in profile) ||
        !isUserRole(profile.role)
      ) {
        throw new Error("A API não retornou uma role de aplicação válida.");
      }
      const profileRecord: Record<string, unknown> = profile;
      if (
        typeof profileRecord.id !== "string" ||
        typeof profileRecord.authUserId !== "string" ||
        typeof profileRecord.name !== "string"
      ) {
        throw new Error("A API não retornou um perfil de aplicação válido.");
      }
      return {
        id: profileRecord.id,
        authUserId: profileRecord.authUserId,
        name: profileRecord.name,
        role: profile.role,
      };
    },
  );
}

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

export function listExpensesByMonth(month: string): Promise<Expense[]> {
  const params = new URLSearchParams({ month });
  return request<Expense[]>(`/expenses?${params.toString()}`);
}

export function getDailyReport(date: string): Promise<DailyReport> {
  return request<DailyReport>(`/reports/daily${dateQuery(date)}`);
}

export function getDailySettlement(date: string): Promise<DailySettlement> {
  return request<DailySettlement>(`/settlements/daily${dateQuery(date)}`);
}

export function closeDailySettlement(date: string): Promise<DailySettlement> {
  return request<DailySettlement>("/settlements/daily/close", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date }),
  });
}

export function getPeriodicReport(
  period: Period,
  date: string,
): Promise<PeriodicReport> {
  const params = new URLSearchParams({ period, date });
  return request<PeriodicReport>(`/reports/periodic?${params.toString()}`);
}
