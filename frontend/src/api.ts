export interface User {
  id: string;
  email: string;
  organisationId: string;
  role: string;
}
export interface Event {
  id: string;
  source: string;
  severity: "info" | "warning" | "critical";
  message: string;
  occurredAt: string;
}
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new APIError(
      response.status,
      data.error || "Request failed. Please try again.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
