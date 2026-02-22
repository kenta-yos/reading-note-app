"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type BurndownDataPoint = {
  month: string;
  target: number | null;
  actual: number | null;
  projection: number | null;
};

type BurndownChartProps = {
  data: BurndownDataPoint[];
};

export default function BurndownChart({ data }: BurndownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
          }
          width={36}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            value != null ? `${Number(value).toLocaleString()} P` : "",
            name ?? "",
          ]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="target"
          name="目標ペース"
          stroke="#cbd5e1"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="実績"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#3b82f6" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="projection"
          name="予測"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
