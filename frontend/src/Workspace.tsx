import { useState, type FormEvent } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { APIError, request, type User, type Event } from "./api";

function Loading() {
  return (
    <Stack alignItems="center" sx={{ py: 8 }}>
      <CircularProgress aria-label="Loading" />
    </Stack>
  );
}
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const login = useMutation({
    mutationFn: () => request<User>("/auth/login", { email, password }),
    onSuccess: (user) => {
      client.clear();
      client.setQueryData(["me"], user);
      navigate("/events", { replace: true });
    },
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate();
  }
  return (
    <Paper
      component="form"
      onSubmit={submit}
      sx={{ p: { xs: 3, sm: 5 }, maxWidth: 420, mx: "auto", mt: 8 }}
    >
      <Stack spacing={3}>
        <Typography variant="overline">OPERATIONS WORKSPACE</Typography>
        <Typography variant="h4" component="h1">
          Sign in to PulseOps
        </Typography>
        <Typography color="text.secondary">
          Explore operational events in your organisation.
        </Typography>
        {login.isError && <Alert severity="error">{login.error.message}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={login.isPending}
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </Stack>
    </Paper>
  );
}
function Events({ user }: { user: User }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const events = useQuery({
    queryKey: ["events", user.organisationId],
    queryFn: () => request<{ events: Event[] }>("/events"),
    retry: false,
  });
  const logout = useMutation({
    mutationFn: () => request<void>("/auth/logout", {}),
    onSuccess: () => {
      client.clear();
      navigate("/login", { replace: true });
    },
  });
  if (events.error instanceof APIError && events.error.status === 401)
    return <Navigate to="/login" replace />;
  return (
    <Stack spacing={3} sx={{ py: 5 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="overline">YOUR ORGANISATION</Typography>
          <Typography variant="h3" component="h1">
            Operational events
          </Typography>
        </Box>
        <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
          Sign out
        </Button>
      </Stack>
      <Typography color="text.secondary">
        {user.email} · {user.role} · Synthetic demonstration data
      </Typography>
      {logout.isError && (
        <Alert severity="error">Sign out failed. Please try again.</Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" component="h2">
          Latest events{" "}
          <Chip size="small" label={events.data?.events.length ?? "—"} />
        </Typography>
        <Button
          disabled={events.isFetching}
          onClick={() => void events.refetch()}
        >
          Refresh
        </Button>
      </Stack>
      {events.isPending ? (
        <Loading />
      ) : events.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => void events.refetch()}>
              Retry
            </Button>
          }
        >
          {events.error.message}
        </Alert>
      ) : events.data.events.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center" }}>
          <Typography variant="h6">No events yet</Typography>
          <Typography color="text.secondary">
            Events will appear here once data is available.
          </Typography>
        </Paper>
      ) : (
        <Stack component="ul" spacing={2} sx={{ p: 0, listStyle: "none" }}>
          {events.data.events.map((event) => (
            <Paper component="li" key={event.id} sx={{ p: 3 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    color={
                      event.severity === "critical"
                        ? "error"
                        : event.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                    label={event.severity}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {event.source}
                  </Typography>
                </Stack>
                <Typography>{event.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString()}
                  </time>
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary">
        Showing up to 100 latest events. Refresh to retrieve updates.
      </Typography>
    </Stack>
  );
}
function ProtectedEvents() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => request<User>("/auth/me"),
    retry: false,
  });
  if (me.isPending) return <Loading />;
  if (me.error instanceof APIError && me.error.status === 401)
    return <Navigate to="/login" replace />;
  if (me.isError)
    return (
      <Alert
        severity="error"
        sx={{ mt: 4 }}
        action={<Button onClick={() => void me.refetch()}>Retry</Button>}
      >
        {me.error.message}
      </Alert>
    );
  return <Events user={me.data} />;
}
export default function App() {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6">PulseOps</Typography>
          <Chip
            label="Phase 1 · Demo"
            size="small"
            sx={{ ml: 2, color: "white", borderColor: "#ffffff55" }}
            variant="outlined"
          />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/events" element={<ProtectedEvents />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </Container>
    </>
  );
}
