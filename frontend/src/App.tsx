import { lazy, Suspense, useState } from "react";
import { Button, Drawer } from "@mui/material";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Pending } from "./demo/Shared";
import "./styles.css";
const Dashboard = lazy(() => import("./demo/Dashboard"));
const Explorer = lazy(() => import("./demo/Explorer"));
const Services = lazy(() => import("./demo/Services"));
const ServicePage = lazy(() => import("./demo/ServicePage"));
const Workspace = lazy(() => import("./Workspace"));
const repo = "https://github.com/charleslin220/pulseops";
function Navigation({ close }: { close: () => void }) {
  return (
    <>
      <Link to="/" className="brand" onClick={close}>
        <span className="brand-mark">ϟ</span>PulseOps
        <span className="brand-version">BETA</span>
      </Link>
      <div className="workspace-badge">
        <span className="workspace-avatar">A</span>
        <span>
          Aurora Platform<small>Public demo workspace</small>
        </span>
      </div>
      <div className="nav-label">OBSERVABILITY</div>
      <nav>
        <NavLink to="/" end onClick={close}>
          <span>▦</span>Overview
        </NavLink>
        <NavLink to="/demo/events" onClick={close}>
          <span>≡</span>Event Explorer
        </NavLink>
        <NavLink to="/demo/services" onClick={close}>
          <span>▤</span>Services
        </NavLink>
        <NavLink to="/engineering" onClick={close}>
          <span>◇</span>Engineering notes
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-card">
          <strong>Built to be explored.</strong>
          <p>A real API. Consistent synthetic data. No account required.</p>
          <a href={repo} target="_blank" rel="noreferrer">
            View source on GitHub ↗
          </a>
        </div>
        <Link to="/login" onClick={close} className="workspace-login">
          Sign in to workspace →
        </Link>
      </div>
    </>
  );
}
function Engineering() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BEHIND THE INTERFACE</div>
          <h1>Built with intention.</h1>
          <p>An ongoing full-stack engineering portfolio by Charles Lin.</p>
        </div>
        <Button component="a" href={repo} variant="contained">
          Explore the source ↗
        </Button>
      </div>
      <div className="engineering-grid">
        {[
          [
            "01",
            "A real vertical slice",
            "React and TypeScript → same-origin REST → Go / chi → PostgreSQL. Public data is seeded into an isolated demo table and queried through a read-only API.",
          ],
          [
            "02",
            "Two distinct access boundaries",
            "Public routes never borrow a signed-in tenant. The private workspace retains opaque HttpOnly sessions, password hashing, CSRF origin checks, role checks and tenant-scoped SQL.",
          ],
          [
            "03",
            "State that belongs somewhere",
            "Search, filters, sort and pagination live in the URL. TanStack Query owns server state. Local state handles presentation. No credentials are stored in browser storage.",
          ],
          [
            "04",
            "Honest operational data",
            "A deterministic 24-hour fixture links service metrics and events. Mean latency is request-weighted; error rate comes from failed and total requests. This is a snapshot, not a live feed.",
          ],
          [
            "05",
            "A deliberately small first release",
            "The 1,728-event corpus is loaded from PostgreSQL and filtered in the Go API, with 50-row responses. SQL filtering, cursor pagination and larger datasets are planned as scale increases.",
          ],
          [
            "06",
            "Designed to keep improving",
            "Service investigations connect comparison windows, chart range selection and correlated change timelines. Next: SQL filtering and larger datasets. Incident workflows and live updates remain future milestones.",
          ],
        ].map(([n, title, body]) => (
          <article className="panel engineering-card" key={n}>
            <span className="eyebrow">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="scenario-strip">
        <div>
          <h3>Read the decisions. Inspect the trade-offs.</h3>
          <p>
            Architecture notes, test coverage and release limitations are
            documented alongside the code.
          </p>
        </div>
        <Button component="a" href={`${repo}/blob/main/ARCHITECTURE.md`}>
          Technical documentation ↗
        </Button>
      </div>
    </>
  );
}
export default function App() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  if (location.pathname === "/login" || location.pathname === "/events")
    return (
      <>
        <div className="back-demo">
          <Link to="/">← Back to public demo</Link>
        </div>
        <Suspense fallback={<Pending />}>
          <Workspace />
        </Suspense>
      </>
    );
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Navigation close={() => setOpen(false)} />
      </aside>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 248, p: 2 } }}
      >
        <Navigation close={() => setOpen(false)} />
      </Drawer>
      <div className="main-column">
        <header className="topbar">
          <Button
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </Button>
          <span>
            Workspace <span className="breadcrumb-separator">/</span>{" "}
            <strong>Aurora Platform</strong>
          </span>
          <div className="topbar-right">
            <span className="read-only-pill">Synthetic demo</span>
            <a href={repo}>GitHub ↗</a>
            <span className="profile-avatar">CL</span>
          </div>
        </header>
        <main id="main" className="main-content">
          <Suspense fallback={<Pending />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/demo/events" element={<Explorer />} />
              <Route path="/demo/services" element={<Services />} />
              <Route
                path="/demo/services/:serviceId"
                element={<ServicePage />}
              />
              <Route path="/engineering" element={<Engineering />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>Page not found</h1>
                    <Link to="/">Return to dashboard</Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
          <footer>
            PulseOps{" "}
            <span>Independent portfolio project · Synthetic data only</span>
            <a href={`${repo}/blob/main/ROADMAP.md`}>Follow the roadmap ↗</a>
          </footer>
        </main>
      </div>
    </div>
  );
}
