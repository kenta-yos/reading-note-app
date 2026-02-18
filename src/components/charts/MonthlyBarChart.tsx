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
import type { MonthlyPages } from "@/lib/types";

type Props = {
  data: MonthlyPages[];
};

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function MonthlyBarChart({ data }: Props) {
  const formatted = data.map((d) => ({
    name: MONTH_LABELS[d.month - 1],
    ページ数: d.pages,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [`${v} ページ`, "読書量"]} />
        <Bar dataKey="ページ数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
