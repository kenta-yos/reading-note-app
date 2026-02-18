type GoalProgressBarProps = {
  current: number;
  goal: number;
  year: number;
};

export default function GoalProgressBar({
  current,
  goal,
  year,
}: GoalProgressBarProps) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - current, 0);

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
      <div className="flex justify-between mt-2">
        <p className="text-xs text-slate-400">{pct.toFixed(1)}% 達成</p>
        <p className="text-xs text-slate-400">
          残り {remaining.toLocaleString()} ページ
        </p>
      </div>
    </div>
  );
}
