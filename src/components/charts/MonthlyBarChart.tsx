"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useState } from "react";
import type { MonthlyPages } from "@/lib/types";

type BookSummary = { id: string; title: string; author: string | null };

type Props = {
  data: MonthlyPages[];
  booksByMonth?: Record<number, BookSummary[]>;
};

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function MonthlyBarChart({ data, booksByMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const formatted = data.map((d) => ({
    name: MONTH_LABELS[d.month - 1],
    month: d.month,
    ページ数: d.pages,
  }));

  const selectedBooks = selectedMonth ? (booksByMonth?.[selectedMonth] ?? []) : [];
  const hasBookData = !!booksByMonth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (barData: any) => {
    const month = barData?.month as number | undefined;
    if (!month) return;
    setSelectedMonth((prev) => (prev === month ? null : month));
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={formatted}
          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false} tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            width={32}
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toLocaleString()} P`, "読書量"]}
            contentStyle={{ fontSize: 12 }}
            cursor={{ fill: "#f1f5f9" }}
          />
          <Bar
            dataKey="ページ数"
            radius={[4, 4, 0, 0]}
            onClick={hasBookData ? handleBarClick : undefined}
            style={{ cursor: hasBookData ? "pointer" : "default" }}
          >
            {formatted.map((d) => (
              <Cell
                key={d.month}
                fill={d.month === selectedMonth ? "#1d4ed8" : "#3b82f6"}
                fillOpacity={d.ページ数 === 0 ? 0.25 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* クリックで表示する月別の本リスト */}
      {selectedMonth && hasBookData && (
        <div className="mt-3 border border-blue-100 rounded-xl bg-blue-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-700">
              {MONTH_LABELS[selectedMonth - 1]}に読んだ本
              <span className="ml-1.5 font-normal text-blue-500">
                （{selectedBooks.length}冊）
              </span>
            </p>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
            >
              閉じる
            </button>
          </div>
          <div className="px-4 py-2.5">
            {selectedBooks.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">この月に読んだ本はありません</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedBooks.map((b) => (
                  <li key={b.id} className="flex items-start gap-2">
                    <span className="text-blue-300 shrink-0 mt-0.5">•</span>
                    <span className="text-xs text-slate-700 font-medium leading-relaxed">{b.title}</span>
                    {b.author && (
                      <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{b.author}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
