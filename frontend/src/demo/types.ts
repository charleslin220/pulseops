export interface Service {
  id: string;
  name: string;
  region: string;
  status: string;
  description: string;
}
export interface Point {
  time: string;
  serviceId: string;
  requests: number;
  errors: number;
  latency: number;
}
export interface DemoEvent {
  id: string;
  serviceId: string;
  service: string;
  region: string;
  severity: string;
  type: string;
  message: string;
  time: string;
  correlation: string;
}
export interface DashboardData {
  version: string;
  referenceTime: string;
  services: Service[];
  allServices: Service[];
  points: Point[];
  distribution: Record<string, number>;
  recent: DemoEvent[];
  summary: {
    requests: number;
    errorRate: number;
    meanLatency: number;
    eventCount: number;
  };
}
export interface EventsData {
  events: DemoEvent[];
  total: number;
  page: number;
  pageSize: number;
  services: Service[];
  referenceTime: string;
}
export const REFERENCE = "2026-10-19T12:00:00Z";
export const number = new Intl.NumberFormat("en-GB");
export function time(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export async function demoRequest<T>(
  endpoint: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/demo/${endpoint}?${params}`, {
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || "Unable to reach the demo. Please try again.",
    );
  }
  return response.json();
}
