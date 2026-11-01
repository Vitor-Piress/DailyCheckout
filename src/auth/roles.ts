export type UserRole = "admin" | "daily_operator";

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "daily_operator";
}

export function isAdmin(role: UserRole | null): boolean {
  return role === "admin";
}

export function isDailyOperator(role: UserRole | null): boolean {
  return role === "daily_operator";
}

export function canAccessExpenses(role: UserRole | null): boolean {
  return isAdmin(role);
}

export function canAccessPeriodicReports(role: UserRole | null): boolean {
  return isAdmin(role);
}
