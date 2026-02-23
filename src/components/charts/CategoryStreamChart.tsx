"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
         ResponsiveContainer, type TooltipContentProps } from "recharts";
import type { CategoryEvolutionData } from "@/lib/types";

const PALETTE = [
  "#3b82f6","#10b981","#f59e0b","#8b5cf6",
  "#ef4444","#06b6d4","#f97316","#84cc16","#94a3b8",
];

function CustomTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const total  = sorted.reduce((s, e) => s + (e.value ?? 0), 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}年</p>
      {sorted.map((e) => (
        <div key={e.dataKey} className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 inline-block"
                  style={{ backgroundColor: e.color }} />
            <span className="text-slate-600">{e.name}</span>
          </span>
          <span className="font-medium tabular-nums">
            {(e.value ?? 0).toLocaleString()} P
          </span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
        <span className="text-slate-500">合計</span>
        <span className="font-semibold tabular-nums">{total.toLocaleString()} P</span>
      </div>
    </div>
  );
}

export default function CategoryStreamChart({ evolutionData }: { evolutionData: CategoryEvolutionData }) {
  const { categories, data } = evolutionData;
  if (!data.length) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      データがありません
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <defs>
          {categories.map((cat, i) => (
            <linearGradient key={cat} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.85} />
              <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }}
               axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
               tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
               width={42} />
        <Tooltip content={CustomTooltip} />
        <Legend iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px", lineHeight: "1.8" }} />
        {categories.map((cat, i) => (
          <Area key={cat} type="monotone" dataKey={cat} stackId="knowledge"
                stroke={PALETTE[i % PALETTE.length]} strokeWidth={1.5}
                fill={`url(#grad-${i})`} name={cat} dot={false} activeDot={{ r: 4 }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
