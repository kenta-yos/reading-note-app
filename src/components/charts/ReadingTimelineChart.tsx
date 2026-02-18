"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyByCategory } from "@/lib/types";

type Props = {
  data: MonthlyByCategory[];
  categories: string[];
};

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899",
];

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function ReadingTimelineChart({ data, categories }: Props) {
  const formatted = data.map((d) => ({
    name: MONTH_LABELS[d.month - 1],
    ...Object.fromEntries(
      categories.map((c) => [c, (d[c] as number | undefined) ?? 0])
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend iconType="circle" iconSize={8} />
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
