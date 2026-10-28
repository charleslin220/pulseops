import { lazy, Suspense, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  Skeleton,
} from "@mui/material";
import {
  demoRequest,
  number,
  REFERENCE,
  time,
  type ServiceData,
} from "./types";
import { Failure, Pending, Status } from "./Shared";
import { RangeControls } from "./RangeControls";
const Chart = lazy(() => import("./Chart"));
const lastHours = (hours: number) =>
  new Date(Date.parse(REFERENCE) - hours * 3600000).toISOString();

export default function ServicePage() {
  const { serviceId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [metric, setMetric] = useState<"latency" | "errors" | "requests">(
    "latency",
  );
  const from = params.get("from") || lastHours(6),
    to = params.get("to") || REFERENCE;
  const compare = params.get("compare") !== "off";
  const api = new URLSearchParams({ from, to });
  const query = useQuery({
    queryKey: ["demo", "service", serviceId, api.toString()],
    queryFn: ({ signal }) =>
      demoRequest<ServiceData>(
        `services/${encodeURIComponent(serviceId)}`,
        api,
        signal,
      ),
    staleTime: 60000,
    retry: 1,
  });
  const selectRange = useCallback(
    (start: string, end: string) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set("from", start);
        next.set("to", end);
        return next;
      });
    },
    [setParams],
  );
  const data = query.data;
  const explore = new URLSearchParams({ service: serviceId, from, to });
  return (
    <>
      <Link className="back-link" to="/demo/services">
        ← All services
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SERVICE INVESTIGATION</div>
          <h1>{data?.service.name || "Service details"}</h1>
          <p>
            {data?.service.description ||
              "Explore operational evidence in context."}
          </p>
        </div>
        {data && (
          <div className="window-status">
            <span>Status at window end</span>
            <Status value={data.service.status} />
          </div>
        )}
      </div>
      <section
        className="panel investigation-controls"
        aria-label="Investigation time window"
      >
        <div className="range-presets">
          <strong>Investigation window</strong>
          {[1, 6, 24].map((h) => (
            <Button
              key={h}
              onClick={() => selectRange(lastHours(h), REFERENCE)}
            >
              Last {h}h
            </Button>
          ))}
          <span className="read-only-pill">Fixed synthetic snapshot</span>
        </div>
        <RangeControls
          key={`${from}:${to}`}
          from={from}
          to={to}
          onChange={selectRange}
        />
      </section>
      {query.isPending ? (
        <Pending />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        data && (
          <>
            <div className="scope-bar">
              <span>
                {data.service.region} · {time(data.current.from)} →{" "}
                {time(data.current.to)} UTC
              </span>
              <Link to={`/demo/events?${explore}`}>
                View all events in this window →
              </Link>
            </div>
            <div className="metric-grid comparison-metrics">
              {[
                [
                  "Requests processed",
                  number.format(data.current.requests),
                  data.previous ? number.format(data.previous.requests) : null,
                ],
                [
                  "Error rate",
                  `${data.current.errorRate.toFixed(2)}%`,
                  data.previous
                    ? `${data.previous.errorRate.toFixed(2)}%`
                    : null,
                ],
                [
                  "Mean latency",
                  `${data.current.meanLatency.toFixed(0)} ms`,
                  data.previous
                    ? `${data.previous.meanLatency.toFixed(0)} ms`
                    : null,
                ],
                [
                  "Failed requests",
                  number.format(data.current.errors),
                  data.previous ? number.format(data.previous.errors) : null,
                ],
              ].map(([label, value, baseline]) => (
                <article className="metric-card blue" key={label}>
                  <span className="metric-label">{label}</span>
                  <strong>{value}</strong>
                  <span className="metric-note">
                    {compare
                      ? baseline
                        ? `Previous window: ${baseline}`
                        : "Previous window unavailable"
                      : "Selected window"}
                  </span>
                </article>
              ))}
            </div>
            {compare && !data.previous && (
              <Alert severity="info">
                The previous equal-length window extends beyond this snapshot.
                Comparison is unavailable; missing data is not treated as zero.
              </Alert>
            )}
            <section className="panel investigation-chart">
              <div className="panel-heading">
                <div>
                  <h2>What changed?</h2>
                  <p>
                    Five-minute samples · UTC · Drag across the chart to select
                    a window
                  </p>
                </div>
                <Select
                  value={metric}
                  size="small"
                  onChange={(e) => setMetric(e.target.value as typeof metric)}
                  inputProps={{ "aria-label": "Service chart metric" }}
                >
                  <MenuItem value="latency">Mean latency (ms)</MenuItem>
                  <MenuItem value="errors">Error rate (%)</MenuItem>
                  <MenuItem value="requests">Requests</MenuItem>
                </Select>
              </div>
              <FormControlLabel
                control={
                  <Switch
                    checked={compare}
                    onChange={(_, checked) => {
                      const next = new URLSearchParams(params);
                      next.set("compare", checked ? "on" : "off");
                      setParams(next);
                    }}
                  />
                }
                label="Compare with previous equal-length window"
              />
              {compare && data.previous && (
                <p className="comparison-caption">
                  Dashed line: {time(data.previous.from)} →{" "}
                  {time(data.previous.to)} UTC, aligned to the selected window.
                </p>
              )}
              <Suspense
                fallback={
                  <Skeleton
                    variant="rounded"
                    height={270}
                    aria-label="Loading chart"
                    role="status"
                  />
                }
              >
                <Chart
                  points={data.points}
                  metric={metric}
                  window={{ from: data.current.from, to: data.current.to }}
                  compare={compare && !!data.previous}
                  onRange={selectRange}
                />
              </Suspense>
              <p className="chart-caption">
                Use the date fields above as a keyboard-accessible alternative
                to chart selection. Solid line: observed values. Shaded area:
                selected window.
              </p>
            </section>
            <section className="panel timeline-panel">
              <div className="panel-heading">
                <div>
                  <h2>Change timeline</h2>
                  <p>
                    Deployments, threshold breaches and recovery; routine checks
                    omitted.
                  </p>
                </div>
                <span className="count-badge">
                  {data.timelineTotal} changes
                </span>
              </div>
              {data.timeline.length === 0 ? (
                <div className="empty-state">
                  <h3>No significant changes in this window</h3>
                  <p>Expand the window or inspect routine events.</p>
                </div>
              ) : (
                <ol className="change-timeline">
                  {data.timeline.map((e) => (
                    <li key={e.id}>
                      <time dateTime={e.time}>{time(e.time)} UTC</time>
                      <div>
                        <Status value={e.severity} />
                        <h3>{e.message}</h3>
                        <p>{e.type.replaceAll("_", " ")}</p>
                        <Link
                          to={`/demo/events?${new URLSearchParams({ correlation: e.correlation, sort: "oldest", selected: e.id })}`}
                        >
                          Follow related events →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {data.timelineTotal > data.timeline.length && (
                <p>
                  Showing the first {data.timeline.length} changes.{" "}
                  <Link to={`/demo/events?${explore}`}>Explore all events</Link>
                </p>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
