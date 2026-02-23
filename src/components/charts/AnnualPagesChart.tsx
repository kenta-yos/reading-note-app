"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type YearEntry = { year: number; pages: number; goal: number | null };
type Payload = { dataKey: string; value: number };
type TooltipArgs = { active?: boolean; payload?: Payload[]; label?: string };

function CustomTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  const pages = payload.find((p) => p.dataKey === "pages")?.value;
  const goal  = payload.find((p) => p.dataKey === "goal")?.value;
  const achieved = goal != null && pages != null && pages >= goal;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}年</p>
      {pages != null && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-slate-500">実績</span>
          <span className="font-medium tabular-nums">{pages.toLocaleString()} P</span>
        </div>
      )}
      {goal != null && (
        <div className="flex justify-between gap-4 mb-0.5">
          <span className="text-slate-500">目標</span>
          <span className="font-medium tabular-nums text-amber-600">{goal.toLocaleString()} P</span>
        </div>
      )}
      {goal != null && pages != null && (
        <div className={`mt-1.5 pt-1.5 border-t border-slate-100 font-semibold ${achieved ? "text-emerald-600" : "text-slate-400"}`}>
          {achieved ? "✓ 目標達成" : `あと ${(goal - pages).toLocaleString()} P`}
        </div>
      )}
    </div>
  );
}

export default function AnnualPagesChart({ data }: { data: YearEntry[] }) {
  if (!data.length) {
    return <p className="text-xs text-slate-400 py-2">データがありません</p>;
  }

  const chartData = data.map((d) => ({ ...d, name: String(d.year) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* 実績バー（達成=緑、未達成=青、目標なし=スレート） */}
        <Bar dataKey="pages" name="実績" radius={[4, 4, 0, 0]} maxBarSize={52}>
          {data.map((d, i) => {
            const achieved = d.goal != null && d.pages >= d.goal;
            const color = d.goal != null ? (achieved ? "#10b981" : "#3b82f6") : "#94a3b8";
            return <Cell key={i} fill={color} />;
          })}
        </Bar>

        {/* 目標ライン（設定がある年だけ点を表示、線でつなぐ） */}
        <Line
          dataKey="goal"
          name="目標"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
