import {
  Alert,
  Button,
  Chip,
  Drawer,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { DemoEvent } from "./types";
import { time } from "./types";
import { Link } from "react-router-dom";
export function Status({ value }: { value: string }) {
  return (
    <Chip
      size="small"
      label={value}
      color={
        value === "critical"
          ? "error"
          : value === "warning" || value === "degraded"
            ? "warning"
            : value === "healthy"
              ? "success"
              : "default"
      }
      variant="outlined"
    />
  );
}
export function Pending() {
  return (
    <Stack spacing={2} role="status" aria-label="Loading operational data">
      <Skeleton height={110} />
      <Skeleton variant="rounded" height={280} />
      <Skeleton height={160} />
    </Stack>
  );
}
export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Alert severity="error" action={<Button onClick={retry}>Retry</Button>}>
      {error.message}
    </Alert>
  );
}
export function Details({
  event,
  onClose,
}: {
  event?: DemoEvent;
  onClose: () => void;
}) {
  return (
    <Drawer
      anchor="right"
      open={!!event}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 450 }, p: 4 } }}
    >
      <Button onClick={onClose} sx={{ alignSelf: "flex-end" }}>
        Close details
      </Button>
      {event && (
        <Stack spacing={3}>
          <Typography variant="overline">EVENT DETAILS</Typography>
          <Status value={event.severity} />
          <Typography variant="h5" component="h2">
            {event.message}
          </Typography>
          <Typography color="text.secondary">
            Synthetic operational event. This public environment is read only.
          </Typography>
          <dl className="detail-list">
            {Object.entries({
              "Event ID": event.id,
              Service: event.service,
              Region: event.region,
              "Occurred at": `${time(event.time)} UTC`,
              Type: event.type.replaceAll("_", " "),
              "Correlation ID": event.correlation,
            }).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <Alert severity="info">
            Correlate this event with service latency and error rates. Temporal
            proximity alone does not establish causation.
          </Alert>
          <Button
            component={Link}
            to={`/demo/services/${event.serviceId}?${new URLSearchParams({ from: new Date(Math.max(Date.parse("2026-10-18T12:00:00Z"), Date.parse(event.time) - 3600000)).toISOString(), to: event.time })}`}
            onClick={onClose}
          >
            Investigate this service →
          </Button>
          <Button
            component={Link}
            to={`/demo/events?${new URLSearchParams({ correlation: event.correlation, sort: "oldest" })}`}
          >
            View correlated events →
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
