import { useEffect, useRef } from "react";
import { init, use as register, type EChartsCoreOption } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  AriaComponent,
  BrushComponent,
  ToolboxComponent,
  MarkAreaComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { Point } from "./types";
register([
  LineChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  BrushComponent,
  ToolboxComponent,
  MarkAreaComponent,
  SVGRenderer,
]);
export default function Chart({
  points,
  metric,
  window: range,
  compare = false,
  onRange,
}: {
  points: Point[];
  metric: "latency" | "errors" | "requests";
  window?: { from: string; to: string };
  compare?: boolean;
  onRange?: (from: string, to: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const from = range?.from,
    to = range?.to;
  useEffect(() => {
    const selected = from && to ? { from, to } : undefined;
    if (!ref.current) return;
    const buckets = new Map<
      string,
      { requests: number; errors: number; latency: number }
    >();
    for (const p of points) {
      const b = buckets.get(p.time) || { requests: 0, errors: 0, latency: 0 };
      b.requests += p.requests;
      b.errors += p.errors;
      b.latency += p.latency * p.requests;
      buckets.set(p.time, b);
    }
    const data = [...buckets].sort(([a], [b]) => a.localeCompare(b));
    const value = (p: { requests: number; errors: number; latency: number }) =>
      metric === "latency"
        ? p.requests
          ? p.latency / p.requests
          : 0
        : metric === "errors"
          ? p.requests
            ? (p.errors / p.requests) * 100
            : 0
          : p.requests;
    const duration = selected
      ? Date.parse(selected.to) - Date.parse(selected.from)
      : 0;
    const byTime = new Map(data.map(([t, p]) => [Date.parse(t), p]));
    const chart = init(ref.current, undefined, { renderer: "svg" });
    const option: EChartsCoreOption = {
      animation: false,
      toolbox: { show: false },
      aria: {
        enabled: true,
        description: `Operational ${metric} time series. Synthetic data. Use the metric selector and time-range controls to explore. The adjacent summary provides numeric values.`,
      },
      grid: { left: 52, right: 20, top: 24, bottom: 40 },
      ...(onRange
        ? {
            brush: {
              xAxisIndex: 0,
              brushType: "lineX",
              brushMode: "single",
              transformable: false,
              throttleType: "debounce",
              throttleDelay: 300,
            },
          }
        : {}),
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) => Number(value).toFixed(1),
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.map(([t]) => t),
        axisLine: { lineStyle: { color: "#dce3ed" } },
        axisLabel: {
          color: "#536079",
          interval: 47,
          formatter: (t: string) => t.slice(11, 16),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#edf1f7" } },
        axisLabel: { color: "#6e7c93" },
      },
      series: [
        {
          type: "line",
          name: "Observed",
          showSymbol: false,
          lineStyle: { width: 2.5, color: "#5266e8" },
          areaStyle: { color: "#5266e8", opacity: 0.09 },
          data: data.map(([, p]) => value(p)),
          ...(selected
            ? {
                markArea: {
                  silent: true,
                  itemStyle: { color: "rgba(82,102,232,0.12)" },
                  data: [
                    [
                      {
                        xAxis: data.find(
                          ([t]) => Date.parse(t) > Date.parse(selected.from),
                        )?.[0],
                      },
                      {
                        xAxis: [...data]
                          .reverse()
                          .find(
                            ([t]) => Date.parse(t) <= Date.parse(selected.to),
                          )?.[0],
                      },
                    ],
                  ],
                },
              }
            : {}),
        },
        ...(compare && selected
          ? [
              {
                name: "Previous window (aligned)",
                type: "line" as const,
                showSymbol: false,
                connectNulls: false,
                lineStyle: {
                  type: "dashed" as const,
                  width: 2,
                  color: "#986327",
                },
                data: data.map(([t]) => {
                  const at = Date.parse(t);
                  const p = byTime.get(at - duration);
                  return at > Date.parse(selected.from) &&
                    at <= Date.parse(selected.to) &&
                    p
                    ? value(p)
                    : null;
                }),
              },
            ]
          : []),
      ],
    };
    chart.setOption(option);
    if (onRange) {
      chart.dispatchAction({
        type: "takeGlobalCursor",
        key: "brush",
        brushOption: { brushType: "lineX", brushMode: "single" },
      });
      chart.on("brushEnd", (event: unknown) => {
        const area = (event as { areas?: { coordRange?: number[] }[] })
          .areas?.[0]?.coordRange;
        if (!area || area.length !== 2 || !area.every(Number.isFinite)) return;
        const a = Math.max(
          0,
          Math.min(data.length - 1, Math.round(Math.min(...area))),
        );
        const b = Math.max(
          a,
          Math.min(data.length - 1, Math.round(Math.max(...area))),
        );
        if (!data[a] || !data[b]) return;
        onRange(
          new Date(Date.parse(data[a][0]) - 300000).toISOString(),
          new Date(data[b][0]).toISOString(),
        );
      });
    }
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [points, metric, from, to, compare, onRange]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Operational ${metric} time series`}
      style={{ height: 270, width: "100%" }}
    />
  );
}
