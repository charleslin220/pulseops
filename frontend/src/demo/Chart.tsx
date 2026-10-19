import { useEffect, useRef } from "react";
import { init, use as register, type EChartsCoreOption } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  AriaComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { Point } from "./types";
register([
  LineChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  SVGRenderer,
]);
export default function Chart({
  points,
  metric,
}: {
  points: Point[];
  metric: "latency" | "errors" | "requests";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
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
    const chart = init(ref.current, undefined, { renderer: "svg" });
    const option: EChartsCoreOption = {
      animation: false,
      aria: {
        enabled: true,
        description:
          "Synthetic operational trend. Use the metric selector and time-range controls to explore. The adjacent summary provides numeric values.",
      },
      grid: { left: 52, right: 20, top: 24, bottom: 40 },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) => Number(value).toFixed(1),
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.map(([t]) => t.slice(11, 16)),
        axisLine: { lineStyle: { color: "#dce3ed" } },
        axisLabel: { color: "#6e7c93", interval: 47 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#edf1f7" } },
        axisLabel: { color: "#6e7c93" },
      },
      series: [
        {
          type: "line",
          showSymbol: false,
          lineStyle: { width: 2.5, color: "#5266e8" },
          areaStyle: { color: "#5266e8", opacity: 0.09 },
          data: data.map(([, p]) =>
            metric === "latency"
              ? Math.round(p.latency / p.requests)
              : metric === "errors"
                ? Number(((p.errors / p.requests) * 100).toFixed(2))
                : p.requests,
          ),
        },
      ],
    };
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [points, metric]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Operational ${metric} time series`}
      style={{ height: 270, width: "100%" }}
    />
  );
}
