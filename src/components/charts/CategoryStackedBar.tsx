"use client";

import { useState } from "react";
import type { CategoryTotal } from "@/lib/types";

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#8b5cf6",
  "#ef4444","#06b6d4","#f97316","#84cc16","#94a3b8",
];

const MAX_CATS = 8;

function limitAndGroup(data: CategoryTotal[]) {
  const sorted = [...data].sort((a, b) => b.pages - a.pages);
  if (sorted.length <= MAX_CATS) return sorted;
  const top = sorted.slice(0, MAX_CATS);
  const rest = sorted.slice(MAX_CATS);
  return [
    ...top,
    {
      category: "その他の分野",
      pages: rest.reduce((s, d) => s + d.pages, 0),
      count: rest.reduce((s, d) => s + d.count, 0),
    },
  ];
}

export default function CategoryStackedBar({ data }: { data: CategoryTotal[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!data.length) {
    return <p className="text-xs text-slate-400 py-2">データがありません</p>;
  }

  const items = limitAndGroup(data);
  const total = items.reduce((s, d) => s + d.pages, 0);

  return (
    <div>
      {/* 1本の横積み上げバー */}
      <div className="flex h-5 rounded-full overflow-hidden gap-px">
        {items.map((cat, i) => {
          const pct = (cat.pages / total) * 100;
          return (
            <div
              key={cat.category}
              style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
              className="transition-opacity"
              title={`${cat.category}：${cat.pages.toLocaleString()}P（${Math.round(pct)}%）`}
              onMouseEnter={() => setHovered(cat.category)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {items.map((cat, i) => {
          const pct = Math.round((cat.pages / total) * 100);
          const isHovered = hovered === cat.category;
          return (
            <div
              key={cat.category}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${isHovered ? "opacity-100" : hovered ? "opacity-50" : "opacity-100"}`}
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-slate-600">{cat.category}</span>
              <span className="text-slate-400 tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
