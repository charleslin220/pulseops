import { useState } from "react";
import { Alert, Button, TextField } from "@mui/material";
import { REFERENCE } from "./types";

export function RangeControls({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [start, setStart] = useState(from.slice(0, 16));
  const [end, setEnd] = useState(to.slice(0, 16));
  const [error, setError] = useState("");
  return (
    <form
      className="range-form"
      onSubmit={(e) => {
        e.preventDefault();
        const a = Date.parse(`${start}:00Z`),
          b = Date.parse(`${end}:00Z`),
          limit = Date.parse(REFERENCE);
        if (
          !Number.isFinite(a) ||
          !Number.isFinite(b) ||
          b - a < 300000 ||
          a % 300000 !== 0 ||
          b % 300000 !== 0 ||
          a < limit - 86400000 ||
          b > limit
        ) {
          setError(
            "Use five-minute boundaries and at least 5 minutes within 18 Oct 12:00 – 19 Oct 12:00 UTC.",
          );
          return;
        }
        setError("");
        onChange(new Date(a).toISOString(), new Date(b).toISOString());
      }}
    >
      <TextField
        label="Window from (UTC)"
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Window to (UTC)"
        type="datetime-local"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Button type="submit" variant="outlined">
        Apply range
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </form>
  );
}
