"use client";

import { DISCIPLINES } from "@/lib/disciplines";
import type { DisciplineTotal } from "@/lib/stats";

type Props = {
  data: DisciplineTotal[];
};

export default function DisciplineBarChart({ data }: Props) {
  // 全分野のマップを作成（データがない分野は0）
  const dataMap = new Map(data.map((d) => [d.discipline, d]));
  const allDisciplines = DISCIPLINES.map((d) => ({
    discipline: d,
    pages: dataMap.get(d)?.pages ?? 0,
    count: dataMap.get(d)?.count ?? 0,
  }));

  // ページ数の降順でソート
  allDisciplines.sort((a, b) => b.pages - a.pages);
  const maxPages = Math.max(...allDisciplines.map((d) => d.pages), 1);

  return (
    <div className="space-y-1.5">
      {allDisciplines.map((d) => {
        const pct = (d.pages / maxPages) * 100;
        const isEmpty = d.pages === 0;
        return (
          <div key={d.discipline} className="flex items-center gap-2">
            <span
              className={`text-xs w-[11rem] shrink-0 text-right truncate ${
                isEmpty ? "text-red-400 font-medium" : "text-slate-600"
              }`}
            >
              {d.discipline}
            </span>
            <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden relative">
              {d.pages > 0 && (
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    backgroundColor: pct > 50 ? "#3b82f6" : pct > 20 ? "#60a5fa" : "#93c5fd",
                  }}
                />
              )}
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-red-300 font-medium">未読</span>
                </div>
              )}
            </div>
            <span
              className={`text-xs w-16 text-right tabular-nums ${
                isEmpty ? "text-red-300" : "text-slate-400"
              }`}
            >
              {d.pages > 0 ? `${d.pages.toLocaleString()}P` : "0P"}
            </span>
            <span
              className={`text-xs w-10 text-right tabular-nums ${
                isEmpty ? "text-red-300" : "text-slate-400"
              }`}
            >
              {d.count}冊
            </span>
          </div>
        );
      })}
    </div>
  );
}
