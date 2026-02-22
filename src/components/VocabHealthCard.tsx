import type { VocabHealthData } from "@/lib/stats";

function rateColor(rate: number): string {
  if (rate >= 0.8) return "#10b981"; // green
  if (rate >= 0.6) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function rateLabel(rate: number): string {
  if (rate >= 0.8) return "良好";
  if (rate >= 0.6) return "要注意";
  return "見直し推奨";
}

function ProgressBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(rate * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function VocabHealthCard({ data }: { data: VocabHealthData }) {
  const {
    matchRate,
    recentMatchRate,
    totalProcessed,
    totalMatched,
    totalNoMatch,
    outOfVocabConcepts,
    yearlyRates,
  } = data;

  const mainColor = rateColor(matchRate);
  const recentColor = rateColor(recentMatchRate);
  const isDeclining = recentMatchRate < matchRate - 0.08;
  const needsRefresh = matchRate < 0.7 || recentMatchRate < 0.6;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">語彙の健全性</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            現在の語彙リスト（{148}語）が蓄積した書籍にどれだけ適合しているか
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: mainColor }}
          >
            {Math.round(matchRate * 100)}%
          </div>
          <div
            className="text-xs font-medium mt-0.5"
            style={{ color: mainColor }}
          >
            {rateLabel(matchRate)}
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 shrink-0">全期間</span>
          <ProgressBar rate={matchRate} color={mainColor} />
          <span
            className="text-xs font-semibold tabular-nums w-9 text-right"
            style={{ color: mainColor }}
          >
            {Math.round(matchRate * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-16 shrink-0">直近2年</span>
          <ProgressBar rate={recentMatchRate} color={recentColor} />
          <span
            className="text-xs font-semibold tabular-nums w-9 text-right"
            style={{ color: recentColor }}
          >
            {Math.round(recentMatchRate * 100)}%
          </span>
        </div>
      </div>

      {/* 冊数サマリー */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-5 pb-5 border-b border-slate-100">
        <span>
          処理済み{" "}
          <span className="font-semibold text-slate-700">{totalProcessed}冊</span>
        </span>
        <span>
          マッチ{" "}
          <span className="font-semibold" style={{ color: rateColor(1) }}>
            {totalMatched}冊
          </span>
        </span>
        <span>
          不一致{" "}
          <span className="font-semibold text-amber-600">{totalNoMatch}冊</span>
        </span>
      </div>

      {/* 年別適合率 */}
      {yearlyRates.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2">年別適合率</p>
          <div className="flex flex-wrap gap-2">
            {yearlyRates.map(({ year, rate, total }) => (
              <div
                key={year}
                className="flex flex-col items-center bg-slate-50 rounded-lg px-3 py-2 min-w-[52px]"
              >
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: rateColor(rate) }}
                >
                  {Math.round(rate * 100)}%
                </span>
                <span className="text-xs text-slate-400">{year}</span>
                <span className="text-xs text-slate-300 tabular-nums">{total}冊</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 語彙外概念 */}
      {outOfVocabConcepts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            語彙外で抽出された概念
            <span className="font-normal text-slate-400 ml-1">
              ─ 語彙リストへの追加候補
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {outOfVocabConcepts.map(({ concept, count }) => (
              <span
                key={concept}
                className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-medium"
                title={`${count}冊で抽出`}
              >
                {concept}
                <span className="ml-1 text-violet-400 font-normal">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* アラート */}
      {(needsRefresh || isDeclining) && (
        <div className="text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-700">
          {isDeclining && !needsRefresh
            ? `💡 直近2年の適合率（${Math.round(recentMatchRate * 100)}%）が全体（${Math.round(matchRate * 100)}%）より低下しています。語彙の見直しを検討してください。`
            : `💡 語彙適合率が${Math.round(matchRate * 100)}%まで低下しています。語彙リストの見直しをおすすめします。`}
        </div>
      )}
    </div>
  );
}
