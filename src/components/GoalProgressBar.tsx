type GoalProgressBarProps = {
  current: number;
  goal: number;
  year: number;
  /** 当月の読書ページ数（現在年のみ渡す） */
  pagesThisMonth?: number;
  /** 現在の月 1〜12（現在年のみ渡す） */
  currentMonth?: number;
};

export default function GoalProgressBar({
  current,
  goal,
  year,
  pagesThisMonth,
  currentMonth,
}: GoalProgressBarProps) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - current, 0);

  // 今月あと何ページ必要か
  let neededThisMonth: number | null = null;
  if (
    currentMonth !== undefined &&
    pagesThisMonth !== undefined &&
    remaining > 0
  ) {
    const monthsRemaining = 12 - currentMonth + 1; // 今月含む残り月数
    const requiredMonthlyPace = remaining / monthsRemaining;
    neededThisMonth = Math.max(
      0,
      Math.ceil(requiredMonthlyPace - pagesThisMonth)
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-slate-600">{year}年 年間目標</p>
        <p className="text-sm font-bold text-slate-700">
          {current.toLocaleString()} / {goal.toLocaleString()} ページ
        </p>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 flex-wrap gap-y-1">
        <p className="text-xs text-slate-400">{pct.toFixed(1)}% 達成</p>
        <p className="text-xs text-slate-400">
          残り {remaining.toLocaleString()} ページ
        </p>
      </div>
      {neededThisMonth !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-500">今月あと</span>
          <span className="text-base font-bold text-blue-600">
            {neededThisMonth.toLocaleString()} ページ
          </span>
          <span className="text-xs text-slate-500">読むとペース通り</span>
        </div>
      )}
    </div>
  );
}
