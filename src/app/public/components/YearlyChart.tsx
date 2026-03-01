"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type YearlyData = { year: number; count: number };

type Props = {
  data: YearlyData[];
  selectedYear: number | null;
  onYearClick: (year: number | null) => void;
};

export default function YearlyChart({
  data,
  selectedYear,
  onYearClick,
}: Props) {
  if (!data.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">年別推移</h2>
      <p className="text-xs text-slate-400 mb-4">
        年ごとの読了冊数（クリックで本リストを絞り込み）
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v) => [`${v} 冊`, "読了数"]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(entry: any) => {
              const year = entry?.year as number | undefined;
              if (!year) return;
              onYearClick(selectedYear === year ? null : year);
            }}
          >
            {data.map((d) => (
              <Cell
                key={d.year}
                fill={
                  selectedYear === d.year ? "#1a5276" : "#93c5fd"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
