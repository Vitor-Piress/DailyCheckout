export type ApiErrorDetails = Record<string, unknown>[];

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(
    message: string,
    status: number,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

if (!apiUrl) {
  throw new Error(
    "A variável VITE_API_URL não foi configurada. Defina-a no arquivo .env.",
  );
}

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
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
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
    throw new ApiError(
      getErrorMessage(body, response.status),
      response.status,
      getErrorDetails(body),
    );
  }

  return body as T;
}
