import { getStatsForYear, getAvailableYears } from "@/lib/stats";
import StatCard from "@/components/StatCard";
import GoalProgressBar from "@/components/GoalProgressBar";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import BurndownChart, { type BurndownDataPoint } from "@/components/charts/BurndownChart";
import YearSelector from "@/components/YearSelector";
import ActionLink from "@/components/ActionLink";
import { Suspense } from "react";

function buildBurndownData(
  monthlyPages: { month: number; pages: number }[],
  goal: number,
  currentYear: number,
  viewYear: number
): BurndownDataPoint[] {
  const today = new Date();
  // 表示年が現在年の場合のみ当月まで actual を描画、それ以外は全月 actual
  const isCurrentYear = viewYear === currentYear;
  const currentMonth = isCurrentYear ? today.getMonth() + 1 : 12;

  let cumulative = 0;
  const pagesByMonth = new Map(monthlyPages.map((m) => [m.month, m.pages]));

  // actual の累積を currentMonth まで計算してから projection を求める
  let cumulativeAtCurrentMonth = 0;
  for (let m = 1; m <= currentMonth; m++) {
    cumulativeAtCurrentMonth += pagesByMonth.get(m) ?? 0;
  }
  const avgPerMonth =
    currentMonth > 0 ? cumulativeAtCurrentMonth / currentMonth : 0;

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthPages = pagesByMonth.get(month) ?? 0;

    // 目標ペース（線形）
    const target = goal > 0 ? Math.round((goal / 12) * month) : null;

    let actual: number | null = null;
    let projection: number | null = null;

    if (month <= currentMonth) {
      cumulative += monthPages;
      actual = cumulative;
      // 当月は projection の起点にもなる
      if (month === currentMonth && isCurrentYear) {
        projection = cumulative;
      }
    } else if (isCurrentYear) {
      // 将来月は予測
      projection = Math.round(
        cumulativeAtCurrentMonth + avgPerMonth * (month - currentMonth)
      );
    }

    return {
      month: `${month}月`,
      target,
      actual,
      projection,
    };
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const year = params.year ? parseInt(params.year) : currentYear;
  const isCurrentYear = year === currentYear;

  const [stats, availableYears] = await Promise.all([
    getStatsForYear(year),
    getAvailableYears(),
  ]);

  const years = [...new Set([...availableYears, currentYear])].sort((a, b) => b - a);

  // 当月のページ数（現在年のみ）
  const pagesThisMonth = isCurrentYear
    ? (stats.monthlyPages.find((m) => m.month === currentMonth)?.pages ?? 0)
    : undefined;

  // バーンダウンチャートデータ（目標がある場合のみ）
  const burndownData = stats.goal
    ? buildBurndownData(stats.monthlyPages, stats.goal.pageGoal, currentYear, year)
    : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-0.5">{year}年の読書状況</p>
        </div>
        <Suspense>
          <YearSelector years={years} currentYear={year} />
        </Suspense>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-5 lg:mb-6">
        <StatCard title="読書数" value={`${stats.totalBooks} 冊`} icon="📚" />
        <StatCard
          title="読書量"
          value={`${stats.totalPages.toLocaleString()} P`}
          icon="📖"
        />
        <StatCard
          title="カテゴリ"
          value={`${stats.categoryTotals.length} 分野`}
          icon="🗂️"
        />
      </div>

      {/* Goal */}
      {stats.goal && (
        <div className="mb-5 lg:mb-6">
          <GoalProgressBar
            current={stats.totalPages}
            goal={stats.goal.pageGoal}
            year={year}
            pagesThisMonth={pagesThisMonth}
            currentMonth={isCurrentYear ? currentMonth : undefined}
          />
        </div>
      )}

      {!stats.goal ? (
        <div className="mb-5 lg:mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center justify-between">
          <span>年間目標が未設定です。</span>
          <ActionLink
            href="/goals"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors min-w-[100px]"
            spinnerClassName="w-4 h-4 text-white"
          >
            🎯 目標を設定する
          </ActionLink>
        </div>
      ) : (
        <div className="mb-5 lg:mb-6">
          <ActionLink
            href="/goals"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm min-h-[44px]"
            spinnerClassName="w-4 h-4 text-blue-500"
          >
            🎯 目標・達成状況を確認する →
          </ActionLink>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-3 lg:mb-4">月別読書ページ数</h2>
          <MonthlyBarChart data={stats.monthlyPages} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-3 lg:mb-4">カテゴリ分布</h2>
          <CategoryPieChart data={stats.categoryTotals} />
        </div>
      </div>

      {/* Burndown Chart */}
      {burndownData && (
        <div className="mt-4 lg:mt-6 bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-1">
            年間ペース予測
          </h2>
          <p className="text-xs text-slate-400 mb-3 lg:mb-4">
            現在のペースで読み続けると年末に到達する累計ページ数の予測です
          </p>
          <BurndownChart data={burndownData} />
        </div>
      )}
    </div>
  );
}
