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
};

export default function DisciplineChart({ data }: Props) {
  if (!data.length) return null;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0].count;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">
        学問分野の分布
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        読了書籍の学問分野別冊数
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr auto",
          alignItems: "center",
          rowGap: 6,
          columnGap: 8,
        }}
      >
        {sorted.map((d, i) => {
          const pct = (d.count / maxCount) * 100;
          const color = COLORS[i % COLORS.length];
          return (
            <>
              <span
                key={`dot-${d.discipline}`}
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span
                key={`name-${d.discipline}`}
                className="text-xs text-slate-600"
                style={{ maxWidth: "10em" }}
              >
                {d.discipline.includes("・")
                  ? d.discipline.split("・").map((part, j, arr) => (
                      <span key={j}>
                        {part}
                        {j < arr.length - 1 && (
                          <>
                            ・<wbr />
                          </>
                        )}
                      </span>
                    ))
                  : d.discipline}
              </span>
              <div
                key={`bar-${d.discipline}`}
                className="h-3 bg-slate-100 rounded-full overflow-hidden"
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span
                key={`count-${d.discipline}`}
                className="text-xs text-slate-400 tabular-nums text-right"
              >
                {d.count}
              </span>
            </>
          );
        })}
      </div>
    </div>
  );
}
