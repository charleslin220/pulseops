import { Button, MenuItem, Pagination, Select, TextField } from "@mui/material";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { demoRequest, number, time, type EventsData } from "./types";
import { Details, Failure, Pending, Status } from "./Shared";
export default function Explorer() {
  const [params, setParams] = useSearchParams();
  const api = new URLSearchParams(params);
  api.delete("selected");
  const query = useQuery({
    queryKey: ["demo", "events", api.toString()],
    queryFn: ({ signal }) => demoRequest<EventsData>("events", api, signal),
    placeholderData: keepPreviousData,
    staleTime: 60000,
    retry: 1,
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page" && key !== "selected") next.delete("page");
    if (key !== "selected") next.delete("selected");
    setParams(next);
  }
  const filters: { key: string; label: string; items: string[][] }[] = [
    {
      key: "service",
      label: "Service",
      items: query.data?.services.map((s) => [s.id, s.name]) || [],
    },
    {
      key: "severity",
      label: "Severity",
      items: [
        ["critical", "Critical"],
        ["warning", "Warning"],
        ["info", "Info"],
      ],
    },
    {
      key: "region",
      label: "Region",
      items: [
        ["eu-west", "EU West"],
        ["us-east", "US East"],
      ],
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OBSERVE / INVESTIGATE</div>
          <h1>Event Explorer</h1>
          <p>Follow the evidence across services, regions and time.</p>
        </div>
        <span className="read-only-pill">Read-only environment</span>
      </div>
      <section className="panel">
        {params.get("correlation") && (
          <div className="correlation-banner">
            <div>
              <strong>Related events across services</strong>
              <p>
                Exact correlation: <code>{params.get("correlation")}</code>
              </p>
            </div>
            <Button onClick={() => update("correlation", "")}>
              Clear correlation
            </Button>
          </div>
        )}
        <div className="filter-bar">
          <TextField
            label="Search events"
            size="small"
            value={params.get("q") || ""}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Message, service or trace ID"
            sx={{ minWidth: 220, flex: 1 }}
          />
          {filters.map(({ key, label, items }) => (
            <Select
              key={key}
              size="small"
              displayEmpty
              value={params.get(key) || ""}
              onChange={(e) => update(key, e.target.value)}
              inputProps={{ "aria-label": label }}
            >
              <MenuItem value="">All {label.toLowerCase()}</MenuItem>
              {items.map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </Select>
          ))}
        </div>
        <div className="filter-bar secondary">
          {["from", "to"].map((key) => (
            <TextField
              key={key}
              size="small"
              label={`${key === "from" ? "From" : "To"} (UTC)`}
              type="datetime-local"
              slotProps={{ inputLabel: { shrink: true } }}
              value={params.get(key)?.slice(0, 16) || ""}
              onChange={(e) =>
                update(key, e.target.value ? `${e.target.value}:00Z` : "")
              }
            />
          ))}
          <Select
            size="small"
            value={params.get("sort") || "newest"}
            onChange={(e) => update("sort", e.target.value)}
            inputProps={{ "aria-label": "Sort order" }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
          </Select>
          <Button
            onClick={() => {
              setParams({});
            }}
          >
            Clear filters
          </Button>
        </div>
        {query.isPending ? (
          <Pending />
        ) : query.isError ? (
          <Failure error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            <div className="results-heading" aria-live="polite">
              <strong>{number.format(query.data.total)} events</strong>
              <span>
                {query.isFetching
                  ? "Updating…"
                  : "Synthetic snapshot · 19 Oct 2026"}{" "}
                · 50 per page
              </span>
            </div>
            {query.data.events.length === 0 ? (
              <div className="empty-state">
                <h2>No matching events</h2>
                <p>
                  Try another service, a wider date range, or clear your
                  filters.
                </p>
                <Button
                  onClick={() => {
                    setParams({});
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Event / message</th>
                      <th>Service</th>
                      <th>Region</th>
                      <th>Time (UTC)</th>
                      <th>
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.events.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Status value={e.severity} />
                        </td>
                        <td>
                          <button
                            className="event-link"
                            onClick={() => update("selected", e.id)}
                          >
                            {e.message}
                          </button>
                          <small>
                            {e.type.replaceAll("_", " ")} · {e.id}
                          </small>
                        </td>
                        <td>
                          <Link to={`/demo/services/${e.serviceId}`}>
                            {e.service}
                          </Link>
                        </td>
                        <td>
                          <span className="region-chip">{e.region}</span>
                        </td>
                        <td className="nowrap">{time(e.time)}</td>
                        <td>
                          <Button
                            size="small"
                            aria-label={`Details for ${e.id}`}
                            onClick={() => update("selected", e.id)}
                          >
                            ↗
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pagination">
              <span>
                Page {query.data.page} of{" "}
                {Math.max(1, Math.ceil(query.data.total / 50))}
              </span>
              <Pagination
                count={Math.max(1, Math.ceil(query.data.total / 50))}
                page={query.data.page}
                onChange={(_, page) => update("page", String(page))}
                disabled={query.isPlaceholderData}
                size="small"
              />
            </div>
          </>
        )}
      </section>
      <Details
        event={query.data?.events.find((e) => e.id === params.get("selected"))}
        onClose={() => update("selected", "")}
      />
    </>
  );
}
