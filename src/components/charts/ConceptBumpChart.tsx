"use client";

import { useState, useEffect } from "react";
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
import type { ConceptBumpData } from "@/lib/concepts";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
  "#a855f7", "#eab308", "#64748b", "#6366f1", "#22c55e",
];

type ConceptBook = {
  id: string;
  title: string;
  author: string | null;
  readAt: string | null;
  rating: number | null;
};

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

export default function ConceptBumpChart({ data }: { data: ConceptBumpData }) {
  const { years, concepts, data: rankData } = data;
  const [selected, setSelected] = useState<string | null>(null);
  const [books, setBooks] = useState<ConceptBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setBooks([]);
      return;
    }
    setBooksLoading(true);
    fetch(`/api/concepts/books?concept=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
  }, [selected]);

  if (!years.length || !concepts.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const chartData = years.map((yr) => {
    const entry = rankData.find((d) => d.year === yr);
    const row: Record<string, number | string> = { year: String(yr) };
    for (const c of concepts) {
      const rank = entry?.ranks[c];
      if (rank !== undefined) row[c] = rank;
    }
    return row;
  });

  const maxRank = concepts.length;
  const latestYear = years[years.length - 1];
  const latestData = rankData.find((d) => d.year === latestYear);

  const handleChipClick = (c: string) => {
    setSelected((prev) => (prev === c ? null : c));
  };

  return (
    <div>
      {/* 概念選択チップ */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {concepts.map((c, i) => {
          const currentRank = latestData?.ranks[c];
          const isSelected = selected === c;
          return (
            <button
              key={c}
              onClick={() => handleChipClick(c)}
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
              {c}
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

      {/* グラフ */}
      <ResponsiveContainer width="100%" height={380}>
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
          {concepts.map((c, i) => {
            const isSelected = selected === c;
            const isOther = selected !== null && !isSelected;
            return (
              <Line
                key={c}
                type="monotone"
                dataKey={c}
                name={c}
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

      {/* 選択中の概念の詳細 */}
      {selected && (() => {
        const idx = concepts.indexOf(selected);
        const appearances = rankData.filter((d) => d.ranks[selected] !== undefined);
        const bestEntry = [...appearances].sort((a, b) => (a.ranks[selected] ?? 99) - (b.ranks[selected] ?? 99))[0];
        return (
          <div
            className="mt-3 rounded-lg border-l-4 overflow-hidden"
            style={{ borderColor: PALETTE[idx % PALETTE.length], backgroundColor: `${PALETTE[idx % PALETTE.length]}10` }}
          >
            <div className="px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold">{selected}</span> は{" "}
              {appearances.map((d) => d.year).join("・")} 年に登場。
              {bestEntry && (` ピークは ${bestEntry.year} 年（#${bestEntry.ranks[selected]}）。`)}
            </div>

            {/* 紐づく本リスト */}
            <div className="border-t px-3 py-2" style={{ borderColor: `${PALETTE[idx % PALETTE.length]}20` }}>
              {booksLoading ? (
                <p className="text-xs text-slate-400 py-1">読み込み中…</p>
              ) : books.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">該当する本が見つかりません</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-400 mb-1.5">
                    この概念が登場する本（{books.length}冊）
                  </p>
                  <div className="space-y-0.5">
                    {books.map((b) => (
                      <a
                        key={b.id}
                        href={`/books/${b.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-white hover:bg-opacity-60 transition group"
                      >
                        <span className="flex-1 text-xs text-slate-700 font-medium truncate group-hover:text-blue-600 transition-colors">
                          {b.title}
                        </span>
                        {b.author && (
                          <span className="text-xs text-slate-400 shrink-0 truncate max-w-[90px] hidden sm:block">
                            {b.author}
                          </span>
                        )}
                        {b.readAt && (
                          <span className="text-xs text-slate-300 shrink-0">
                            {new Date(b.readAt).getFullYear()}年
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
