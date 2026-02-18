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

export default function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const formatted = data.map((d) => ({ name: d.category, value: d.pages }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} ページ`]} />
        <Legend iconType="circle" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  );
}
