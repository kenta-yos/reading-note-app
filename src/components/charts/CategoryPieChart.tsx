"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryTotal } from "@/lib/types";

type Props = {
  data: CategoryTotal[];
};

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899",
];

const MAX_CATEGORIES = 8;

function limitAndGroup(data: CategoryTotal[]) {
  const sorted = [...data].sort((a, b) => b.pages - a.pages);
  if (sorted.length <= MAX_CATEGORIES) return sorted;
  const top = sorted.slice(0, MAX_CATEGORIES);
  const rest = sorted.slice(MAX_CATEGORIES);
  return [
    ...top,
    {
      category: "その他",
      pages: rest.reduce((s, d) => s + d.pages, 0),
      count: rest.reduce((s, d) => s + d.count, 0),
    },
  ];
}

export default function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const limited = limitAndGroup(data);
  const formatted = limited.map((d) => ({ name: d.category, value: d.pages }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="42%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} ページ`]} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", lineHeight: "1.6" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
