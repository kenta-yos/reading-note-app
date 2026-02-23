"use client";
import type { KeywordHeatmapData } from "@/lib/keywords";

type Props = { data: KeywordHeatmapData };

// count を 0〜max にマップして opacity を返す
function cellOpacity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0;
  return 0.12 + (count / max) * 0.88;
}

export default function KeywordHeatmap({ data }: Props) {
  const { years, keywords, matrix } = data;

  if (keywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        キーワードデータがありません
      </div>
    );
  }

  // 全セルの最大値（正規化用）
  const maxCount = Math.max(
    ...keywords.flatMap((kw) => years.map((yr) => matrix[kw]?.[yr] ?? 0))
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            {/* キーワード列ヘッダー */}
            <th className="sticky left-0 bg-white z-10 w-32 min-w-[8rem] px-2 py-1.5 text-left text-slate-400 font-normal border-b border-slate-100">
              キーワード
            </th>
            {years.map((yr) => (
              <th
                key={yr}
                className="min-w-[3rem] px-1 py-1.5 text-center text-slate-500 font-semibold border-b border-slate-100"
              >
                {yr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keywords.map((kw, ki) => {
            const rowTotal = years.reduce(
              (s, yr) => s + (matrix[kw]?.[yr] ?? 0),
              0
            );
            return (
              <tr
                key={kw}
                className={ki % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
              >
                {/* キーワード名 */}
                <td className="sticky left-0 z-10 px-2 py-1 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100"
                    style={{ background: ki % 2 === 0 ? "#fff" : "rgb(248 250 252 / 0.6)" }}>
                  <span>{kw}</span>
                  <span className="ml-1.5 text-slate-400 font-normal">
                    ({rowTotal})
                  </span>
                </td>
                {/* セル */}
                {years.map((yr) => {
                  const count = matrix[kw]?.[yr] ?? 0;
                  const opacity = cellOpacity(count, maxCount);
                  return (
                    <td
                      key={yr}
                      title={count > 0 ? `${kw} / ${yr}年: ${count}回` : undefined}
                      className="text-center py-1 px-1"
                    >
                      {count > 0 ? (
                        <span
                          className="inline-flex items-center justify-center w-full min-w-[2rem] h-6 rounded text-[10px] font-semibold select-none"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                            color: opacity > 0.5 ? "#fff" : "#3b82f6",
                          }}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="inline-block w-full min-w-[2rem] h-6" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
