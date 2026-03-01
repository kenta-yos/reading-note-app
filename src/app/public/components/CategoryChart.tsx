"use client";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#f97316", "#84cc16",
  "#94a3b8", "#e879f9", "#22d3ee", "#a3e635",
  "#fb923c", "#38bdf8", "#c084fc", "#4ade80",
];

type DisciplineData = { discipline: string; count: number };

type Props = {
  data: DisciplineData[];
  selectedDiscipline: string | null;
  onDisciplineClick: (discipline: string | null) => void;
};

export default function DisciplineChart({
  data,
  selectedDiscipline,
  onDisciplineClick,
}: Props) {
  if (!data.length) return null;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0].count;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">
        学問分野の分布
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        クリックで本リストを絞り込み
      </p>
      <div className="space-y-1.5">
        {sorted.map((d, i) => {
          const isSelected = selectedDiscipline === d.discipline;
          const pct = (d.count / maxCount) * 100;
          return (
            <button
              key={d.discipline}
              onClick={() =>
                onDisciplineClick(isSelected ? null : d.discipline)
              }
              className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors hover:bg-slate-50 ${
                isSelected ? "bg-slate-100" : ""
              }`}
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
              <span className="text-xs text-slate-600 w-28 truncate shrink-0">
                {d.discipline}
              </span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isSelected
                      ? "#1a5276"
                      : COLORS[i % COLORS.length],
                  }}
                />
              </div>
              <span className="text-xs text-slate-400 tabular-nums w-8 text-right shrink-0">
                {d.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
