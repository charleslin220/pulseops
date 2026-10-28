import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { MenuItem, Select, TextField } from "@mui/material";
import { demoRequest, type DashboardData } from "./types";
import { Failure, Pending, Status } from "./Shared";

export default function Services() {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") || "";
  const region = params.get("region") || "";
  const query = useQuery({
    queryKey: ["demo", "dashboard", ""],
    queryFn: ({ signal }) =>
      demoRequest<DashboardData>("dashboard", new URLSearchParams(), signal),
    staleTime: 60000,
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const services = query.data?.services.filter(
    (s) =>
      (!region || s.region === region) &&
      `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OBSERVE / SERVICES</div>
          <h1>Know every service.</h1>
          <p>Move from platform health to the evidence behind each service.</p>
        </div>
        <span className="read-only-pill">6 synthetic services</span>
      </div>
      <div className="panel filter-bar">
        <TextField
          label="Find a service"
          value={search}
          onChange={(e) => update("q", e.target.value)}
          size="small"
        />
        <Select
          displayEmpty
          value={region}
          onChange={(e) => update("region", e.target.value)}
          size="small"
          inputProps={{ "aria-label": "Service region" }}
        >
          <MenuItem value="">All regions</MenuItem>
          <MenuItem value="eu-west">EU West</MenuItem>
          <MenuItem value="us-east">US East</MenuItem>
        </Select>
      </div>
      {query.isPending ? (
        <Pending />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="service-directory">
          {services?.map((s) => (
            <Link
              className="panel service-card"
              key={s.id}
              to={`/demo/services/${s.id}`}
            >
              <div className="service-card-top">
                <span className="service-icon">
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
                <Status value={s.status} />
              </div>
              <h2>{s.name}</h2>
              <p>{s.description}</p>
              <div className="service-card-footer">
                <span>{s.region}</span>
                <span>Investigate service →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {services?.length === 0 && (
        <div className="empty-state">
          <h2>No matching services</h2>
          <p>Try another name or region.</p>
        </div>
      )}
      <section className="scenario-strip">
        <div>
          <div className="eyebrow">GUIDED INVESTIGATION</div>
          <h2>One region. Two affected services.</h2>
          <p>
            Compare the US East outage with its baseline, then follow the shared
            correlation ID across services.
          </p>
        </div>
        <Link
          className="scenario-link"
          to="/demo/services/identity?from=2026-10-18T21%3A55%3A00Z&to=2026-10-18T23%3A10%3A00Z"
        >
          Explore regional recovery →
        </Link>
      </section>
    </>
  );
}
