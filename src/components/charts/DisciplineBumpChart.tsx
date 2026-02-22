"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";
import type { DisciplineBumpData } from "@/lib/stats";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  "#a855f7", "#eab308",
];

function BumpTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const ranked = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => (a.value ?? 99) - (b.value ?? 99));
  if (!ranked.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}年</p>
      {ranked.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums text-slate-800">#{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DisciplineBumpChart({ data }: { data: DisciplineBumpData }) {
  const { years, disciplines, data: rankData } = data;
  const [selected, setSelected] = useState<string | null>(null);

  if (!years.length || !disciplines.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const chartData = years.map((yr) => {
    const entry = rankData.find((d) => d.year === yr);
    const row: Record<string, number | string> = { year: String(yr) };
    for (const d of disciplines) {
      const rank = entry?.ranks[d];
      if (rank !== undefined) row[d] = rank;
    }
    return row;
  });

  const maxRank = disciplines.length;
  const latestYear = years[years.length - 1];
  const latestData = rankData.find((d) => d.year === latestYear);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {disciplines.map((d, i) => {
          const currentRank = latestData?.ranks[d];
          const isSelected = selected === d;
          return (
            <button
              key={d}
              onClick={() => setSelected((prev) => (prev === d ? null : d))}
              className={[
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                isSelected
                  ? "text-white shadow-sm scale-105"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              ].join(" ")}
              style={isSelected ? { backgroundColor: PALETTE[i % PALETTE.length] } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              {d}
              {currentRank && (
                <span className={isSelected ? "opacity-80" : "text-slate-400"}>
                  #{currentRank}
                </span>
              )}
            </button>
          );
        })}
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="px-2.5 py-1 rounded-full text-xs text-slate-400 hover:text-slate-600 border border-slate-200"
          >
            解除
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, maxRank]}
            ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
            tickFormatter={(v: number) => `#${v}`}
            tick={{ fontSize: 10, fill: "#cbd5e1" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={BumpTooltip} />
          {disciplines.map((d, i) => {
            const isSelected = selected === d;
            const isOther = selected !== null && !isSelected;
            return (
              <Line
                key={d}
                type="monotone"
                dataKey={d}
                name={d}
                stroke={isOther ? "#e2e8f0" : PALETTE[i % PALETTE.length]}
                strokeWidth={isSelected ? 3.5 : isOther ? 1 : 1.5}
                strokeOpacity={isOther ? 0.6 : 1}
                dot={
                  isSelected
                    ? { r: 5, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }
                    : isOther
                    ? false
                    : { r: 3, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }
                }
                activeDot={isOther ? false : { r: 6 }}
                connectNulls={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
