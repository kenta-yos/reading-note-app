"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TagFrequency } from "@/lib/types";

type Props = {
  data: TagFrequency[];
};

export default function TagFrequencyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        タグがありません
      </div>
    );
  }

  const formatted = data.map((d) => ({ name: d.tag, 件数: d.count }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(v) => [`${v} 件`]} />
        <Bar dataKey="件数" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
