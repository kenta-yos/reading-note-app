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

type GoalData = {
  year: number;
  actual: number;
  goal: number;
};

type Props = {
  data: GoalData[];
};

export default function GoalComparisonChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const formatted = data.map((d) => ({
    name: `${d.year}年`,
    目標: d.goal,
    実績: d.actual,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} ページ`]} />
        <Legend />
        <Bar dataKey="目標" fill="#e2e8f0" stroke="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="実績" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
