import { authClient, getAuthToken } from "../auth/authClient";

export type ApiErrorDetails = Record<string, unknown>[];

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(message: string, status: number, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function getErrorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  if (status === 401) {
    return "Sua sessão expirou ou não é válida. Faça login novamente.";
  }

  if (status === 403) {
    return "Você está autenticado, mas não tem permissão para acessar este recurso.";
  }

  return `A API retornou um erro HTTP ${status}.`;
}

function getErrorDetails(body: unknown): ApiErrorDetails | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "details" in body &&
    Array.isArray(body.details)
  ) {
    return body.details.filter(
      (detail): detail is Record<string, unknown> =>
        typeof detail === "object" && detail !== null,
    );
  }

  return undefined;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!apiUrl) {
    throw new ApiError(
      "A variável VITE_API_URL não foi configurada. Defina-a no arquivo .env.",
      0,
    );
  }

  const token = await getAuthToken();

  if (!token) {
    window.dispatchEvent(new Event("auth:session-expired"));
    throw new ApiError("Sua sessão não está disponível. Faça login novamente.", 401);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (cause: unknown) {
    throw new ApiError(
      cause instanceof Error
        ? `Não foi possível conectar à API: ${cause.message}`
        : "Não foi possível conectar à API.",
      0,
    );
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      void authClient.signOut().finally(() => {
        window.dispatchEvent(new Event("auth:session-expired"));
      });
    }

    throw new ApiError(
      getErrorMessage(body, response.status),
      response.status,
      getErrorDetails(body),
    );
  }

  return body as T;
}
