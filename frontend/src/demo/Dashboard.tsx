import { lazy, Suspense, useState } from "react";
import { Button, MenuItem, Select, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  demoRequest,
  number,
  REFERENCE,
  time,
  type DashboardData,
} from "./types";
import { Failure, Pending, Status } from "./Shared";
const Chart = lazy(() => import("./Chart"));
export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const [metric, setMetric] = useState<"latency" | "errors" | "requests">(
    "latency",
  );
  const service = params.get("service") || "";
  const hours = params.get("hours") || "24";
  const api = new URLSearchParams();
  if (service) api.set("service", service);
  api.set(
    "from",
    new Date(
      Date.parse(REFERENCE) -
        Number(["1", "6", "24"].includes(hours) ? hours : "24") * 3600000,
    ).toISOString(),
  );
  const query = useQuery({
    queryKey: ["demo", "dashboard", api.toString()],
    queryFn: ({ signal }) =>
      demoRequest<DashboardData>("dashboard", api, signal),
    staleTime: 60000,
    retry: 1,
  });
  function scope(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  const explore = `/demo/events?${api}`;
  function drilldown(values: Record<string, string>) {
    const next = new URLSearchParams(api);
    for (const [key, value] of Object.entries(values)) next.set(key, value);
    return `/demo/events?${next}`;
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE OVERVIEW</div>
          <h1>Operations at a glance</h1>
          <p>
            Monitor service health. Find the signal. Investigate what changed.
          </p>
        </div>
        <Button component={Link} to={explore} variant="contained">
          Explore events ↗
        </Button>
      </div>
      <div className="scope-bar">
        <span className="snapshot-dot" />{" "}
        <span>Synthetic snapshot · 19 Oct 2026, 12:00 UTC</span>
        <div className="scope-controls">
          <Select
            displayEmpty
            size="small"
            value={service}
            onChange={(e) => scope("service", e.target.value)}
            inputProps={{ "aria-label": "Service" }}
          >
            <MenuItem value="">All services</MenuItem>
            {query.data?.allServices.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={hours}
            onChange={(e) => scope("hours", e.target.value)}
            inputProps={{ "aria-label": "Time range" }}
          >
            {["1", "6", "24"].map((h) => (
              <MenuItem key={h} value={h}>
                Last {h} hours
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>
      {query.isPending ? (
        <Pending />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="metric-grid">
            {[
              [
                "Services healthy",
                `${query.data.services.filter((s) => s.status === "healthy").length} / ${query.data.services.length}`,
                "At the end of the selected window",
                "green",
              ],
              [
                "Requests processed",
                Intl.NumberFormat("en", {
                  notation: "compact",
                  maximumFractionDigits: 2,
                }).format(query.data.summary.requests),
                "Across the selected service scope",
                "blue",
              ],
              [
                "Error rate",
                `${query.data.summary.errorRate.toFixed(2)}%`,
                "Failed requests / total requests",
                "amber",
              ],
              [
                "Mean response time",
                `${query.data.summary.meanLatency.toFixed(0)} ms`,
                "Request-weighted mean latency",
                "violet",
              ],
            ].map(([label, value, note, color]) => (
              <article className={`metric-card ${color}`} key={label}>
                <span className="metric-label">{label}</span>
                <strong>{value}</strong>
                <span className="metric-note">{note}</span>
              </article>
            ))}
          </div>
          <div className="chart-grid">
            <section className="panel trend-panel">
              <div className="panel-heading">
                <div>
                  <h2>Service performance</h2>
                  <p>Five-minute samples · UTC</p>
                </div>
                <Select
                  size="small"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as typeof metric)}
                  inputProps={{ "aria-label": "Chart metric" }}
                >
                  <MenuItem value="latency">Mean latency (ms)</MenuItem>
                  <MenuItem value="errors">Error rate (%)</MenuItem>
                  <MenuItem value="requests">Requests</MenuItem>
                </Select>
              </div>
              <Suspense fallback={<Pending />}>
                <Chart points={query.data.points} metric={metric} />
              </Suspense>
              <div className="chart-caption">
                <span className="legend-dot" />{" "}
                {number.format(query.data.points.length)} metric samples in this
                view
                <Link
                  to={drilldown({ service: "checkout", severity: "critical" })}
                >
                  Investigate checkout spike →
                </Link>
              </div>
            </section>
            <section className="panel severity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Event breakdown</h2>
                  <p>Severity in the selected window</p>
                </div>
              </div>
              <div className="event-total">
                {number.format(query.data.summary.eventCount)}
                <span>operational events</span>
              </div>
              {Object.entries(query.data.distribution)
                .reverse()
                .map(([name, count]) => (
                  <Link
                    key={name}
                    className="severity-row"
                    to={`${explore}&severity=${name}`}
                  >
                    <div>
                      <span className={`severity-mark ${name}`} />
                      {name}
                      <strong>{number.format(count)}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${name}`}
                        style={{
                          width: `${query.data.summary.eventCount ? (count / query.data.summary.eventCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              <p className="muted small">
                Select a severity to investigate its events.
              </p>
            </section>
          </div>
          <div className="lower-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Service health</h2>
                  <p>Current status within your selected scope</p>
                </div>
                <span className="count-badge">
                  {query.data.services.length} services
                </span>
              </div>
              <div className="service-list">
                {query.data.services.map((s) => (
                  <Link
                    className="service-row"
                    key={s.id}
                    to={drilldown({ service: s.id })}
                  >
                    <span className="service-icon">
                      {s.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="service-name">
                      {s.name}
                      <small>{s.region} · Production demo</small>
                    </span>
                    <Status value={s.status} />
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent activity</h2>
                  <p>Latest observations from the platform</p>
                </div>
                <Link to={explore}>View all →</Link>
              </div>
              <div className="activity-list">
                {query.data.recent.map((e) => (
                  <Link
                    to={`${explore}&q=${encodeURIComponent(e.correlation)}&selected=${e.id}`}
                    key={e.id}
                    className="activity-row"
                  >
                    <span className={`severity-mark ${e.severity}`} />
                    <span>
                      <strong>{e.message}</strong>
                      <small>
                        {e.service} · {time(e.time)}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <div className="scenario-strip">
            <div>
              <Typography variant="overline">A GOOD PLACE TO START</Typography>
              <h3>What happened to checkout latency?</h3>
              <p>
                Follow a deployment marker, inspect the elevated error rate, and
                trace the recovery.
              </p>
            </div>
            <Button
              component={Link}
              to="/demo/events?service=checkout&from=2026-10-19T03%3A30%3A00Z&to=2026-10-19T06%3A00%3A00Z"
              variant="outlined"
            >
              Investigate scenario →
            </Button>
          </div>
        </>
      )}
    </>
  );
}
