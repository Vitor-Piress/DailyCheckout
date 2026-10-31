import { ApiError } from "../api/client";

export function getApiErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    return cause.message;
  }

  return cause instanceof Error ? cause.message : fallback;
}
