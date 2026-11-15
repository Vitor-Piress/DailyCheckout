import { ApiError, request } from "./client";
import {
  invalidateClientQueries,
  invalidateReportQueries,
} from "./clientInvalidation";
import type {
  CancelServiceRecordResponse,
  Client,
  ClientPackDetail,
  ClientServiceRecordsFilterType,
  ClientServiceRecordsResponse,
  ClientsListResponse,
  CreateClientInput,
  CreateClientPackInput,
  CreateExpenseInput,
  CreateServiceRecordInput,
  DailyReport,
  Expense,
  PackPlan,
  Period,
  PeriodicReport,
  ServiceRecord,
  ServiceType,
  UpdateClientInput,
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

export async function createServiceRecord(
  input: CreateServiceRecordInput,
): Promise<ServiceRecord> {
  const tipCents =
    typeof input.tipCents === "number" && input.tipCents > 0
      ? Math.trunc(input.tipCents)
      : 0;

  if (input.useLoyaltyReward) {
    const payload = {
      clientId: input.clientId,
      useLoyaltyReward: true,
      ...(input.serviceTypeId ? { serviceTypeId: input.serviceTypeId } : {}),
      ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      ...(tipCents > 0 ? { tipCents } : {}),
      ...(tipCents > 0 && input.tipPaymentMethod
        ? { tipPaymentMethod: input.tipPaymentMethod }
        : {}),
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    const created = await request<ServiceRecord>("/service-records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    invalidateClientQueries(created.clientId ?? input.clientId);
    invalidateReportQueries();
    return created;
  }

  if (input.useActivePack) {
    const payload = {
      clientId: input.clientId,
      useActivePack: true,
      ...(input.clientPackId ? { clientPackId: input.clientPackId } : {}),
      ...(tipCents > 0 ? { tipCents } : {}),
      ...(tipCents > 0 && input.tipPaymentMethod
        ? { tipPaymentMethod: input.tipPaymentMethod }
        : {}),
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    const created = await request<ServiceRecord>("/service-records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    invalidateClientQueries(created.clientId ?? input.clientId);
    invalidateReportQueries();
    return created;
  }

  const payload = {
    serviceTypeId: input.serviceTypeId,
    paymentMethod: input.paymentMethod,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(tipCents > 0 ? { tipCents } : {}),
    ...(tipCents > 0 &&
    input.tipPaymentMethod &&
    input.tipPaymentMethod !== input.paymentMethod
      ? { tipPaymentMethod: input.tipPaymentMethod }
      : {}),
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  const created = await request<ServiceRecord>("/service-records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  invalidateClientQueries(created.clientId ?? input.clientId);
  invalidateReportQueries();
  return created;
}

export function listServiceRecords(date: string): Promise<ServiceRecord[]> {
  return request<ServiceRecord[]>(`/service-records${dateQuery(date)}`);
}

export async function cancelServiceRecord(
  recordId: string,
  reason?: string,
  clientId?: string,
): Promise<CancelServiceRecordResponse | ServiceRecord | void> {
  const result = await request<
    CancelServiceRecordResponse | ServiceRecord | void
  >(`/service-records/${encodeURIComponent(recordId)}/cancel`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
  });
  const resolvedClientId =
    result &&
    typeof result === "object" &&
    "clientId" in result &&
    typeof result.clientId === "string"
      ? result.clientId
      : clientId;
  invalidateClientQueries(resolvedClientId);
  invalidateReportQueries();
  return result;
}

export function listClients(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<ClientsListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number") {
    searchParams.set("offset", String(params.offset));
  }
  const query = searchParams.toString();
  return request<ClientsListResponse>(`/clients${query ? `?${query}` : ""}`);
}

export function createClient(input: CreateClientInput): Promise<Client> {
  return request<Client>("/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function getClient(id: string): Promise<Client> {
  return request<Client>(`/clients/${encodeURIComponent(id)}`);
}

export function updateClient(
  id: string,
  input: UpdateClientInput,
): Promise<Client> {
  return request<Client>(`/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function listPackPlans(): Promise<PackPlan[]> {
  const response = await request<PackPlan[] | { items: PackPlan[] }>(
    "/pack-plans",
  );
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object" && Array.isArray(response.items)) {
    return response.items;
  }
  return [];
}

export async function createClientPack(
  input: CreateClientPackInput,
): Promise<ClientPackDetail> {
  const payload: Record<string, unknown> = {
    clientId: input.clientId,
    packPlanId: input.packPlanId,
    paymentMethod: input.paymentMethod,
    ...(input.email ? { email: input.email } : {}),
    ...(input.cpf ? { cpf: input.cpf } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  if (input.redeemFirstCut) {
    payload.redeemFirstCut = true;
    if (typeof input.tipCents === "number" && input.tipCents > 0) {
      payload.tipCents = Math.trunc(input.tipCents);
      if (input.tipPaymentMethod) {
        payload.tipPaymentMethod = input.tipPaymentMethod;
      }
    }
  }

  const created = await request<ClientPackDetail>("/client-packs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  invalidateClientQueries(created.clientId ?? input.clientId);
  invalidateReportQueries();
  return created;
}

export function listClientServiceRecords(
  clientId: string,
  params?: {
    type?: ClientServiceRecordsFilterType;
    includeCanceled?: boolean;
    limit?: number;
    offset?: number;
  },
): Promise<ClientServiceRecordsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.type) {
    searchParams.set("type", params.type);
  }
  if (typeof params?.includeCanceled === "boolean") {
    searchParams.set("includeCanceled", String(params.includeCanceled));
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number") {
    searchParams.set("offset", String(params.offset));
  }
  const query = searchParams.toString();
  return request<ClientServiceRecordsResponse>(
    `/clients/${encodeURIComponent(clientId)}/service-records${query ? `?${query}` : ""}`,
  );
}

export async function listClientPacks(
  clientId: string,
): Promise<ClientPackDetail[]> {
  const response = await request<
    ClientPackDetail[] | { items: ClientPackDetail[] }
  >(`/clients/${encodeURIComponent(clientId)}/packs`);
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object" && Array.isArray(response.items)) {
    return response.items;
  }
  return [];
}

export function getClientPack(packId: string): Promise<ClientPackDetail> {
  return request<ClientPackDetail>(`/client-packs/${encodeURIComponent(packId)}`);
}

export async function cancelClientPack(
  packId: string,
  reason?: string,
  clientId?: string,
): Promise<ClientPackDetail> {
  const result = await request<ClientPackDetail>(
    `/client-packs/${encodeURIComponent(packId)}/cancel`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    },
  );
  invalidateClientQueries(result.clientId ?? clientId);
  invalidateReportQueries();
  return result;
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
  return request<DailyReport>(`/reports/daily${dateQuery(date)}`).catch((cause) => {
    if (cause instanceof ApiError) {
      throw new ApiError(
        `Relatório diário: ${cause.message}`,
        cause.status,
        cause.details,
      );
    }
    throw cause;
  });
}

export function closeDailySettlement(date: string): Promise<void> {
  return request<void>("/settlements/daily/close", {
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
