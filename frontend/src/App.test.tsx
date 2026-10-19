import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import App from "./Workspace";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const user = {
  id: "one",
  organisationId: "org",
  email: "alex@example.test",
  role: "admin",
};
function mount(path = "/events") {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
it("redirects anonymous users to login", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(respond({ error: "Authentication required" }, 401)),
  );
  mount();
  expect(
    await screen.findByRole("heading", { name: "Sign in to PulseOps" }),
  ).toBeTruthy();
});
it("shows loading while authentication is pending", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  mount();
  expect(screen.getByRole("progressbar")).toBeTruthy();
});
it("shows empty data state", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(respond(user))
      .mockResolvedValueOnce(respond({ events: [] })),
  );
  mount();
  expect(await screen.findByText("No events yet")).toBeTruthy();
});
it("shows API events", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(respond(user))
      .mockResolvedValueOnce(
        respond({
          events: [
            {
              id: "event",
              source: "synthetic",
              severity: "info",
              message: "Service check completed",
              occurredAt: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      ),
  );
  mount();
  expect(await screen.findByText("Service check completed")).toBeTruthy();
});
it("shows recoverable service error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(respond(user))
      .mockResolvedValueOnce(respond({ error: "Unable to load events" }, 503)),
  );
  mount();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});
it("submits login and loads authenticated events", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async (path) =>
    respond(String(path).endsWith("/events") ? { events: [] } : user),
  );
  vi.stubGlobal("fetch", fetch);
  mount("/login");
  const actor = userEvent.setup();
  await actor.type(screen.getByLabelText(/Email/), user.email);
  await actor.type(screen.getByLabelText(/Password/), "example-input-only");
  await actor.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("No events yet")).toBeTruthy();
  expect(fetch.mock.calls[0][1]?.credentials).toBe("same-origin");
});
