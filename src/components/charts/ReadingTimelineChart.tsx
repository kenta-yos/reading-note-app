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

const MAX_CATEGORIES = 8;

export default function ReadingTimelineChart({ data, categories }: Props) {
  // Compute total pages per category across all months to pick top N
  const totals: Record<string, number> = {};
  for (const cat of categories) {
    totals[cat] = data.reduce((s, d) => s + ((d[cat] as number | undefined) ?? 0), 0);
  }
  const sorted = [...categories].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
  const topCats = sorted.slice(0, MAX_CATEGORIES);
  const restCats = sorted.slice(MAX_CATEGORIES);
  const displayCats = restCats.length > 0 ? [...topCats, "その他"] : topCats;

  const formatted = data.map((d) => {
    const row: Record<string, string | number> = { name: MONTH_LABELS[d.month - 1] };
    for (const cat of topCats) {
      row[cat] = (d[cat] as number | undefined) ?? 0;
    }
    if (restCats.length > 0) {
      row["その他"] = restCats.reduce((s, c) => s + ((d[c] as number | undefined) ?? 0), 0);
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", lineHeight: "1.6" }}
        />
        {displayCats.map((cat, i) => (
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
