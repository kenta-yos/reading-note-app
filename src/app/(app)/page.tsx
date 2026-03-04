export const revalidate = 60;

import { Suspense } from "react";
import { getStatsForYear, getAvailableYears, getYearlyTrend } from "@/lib/stats";
import { getConceptGraph } from "@/lib/concepts";
import { prisma } from "@/lib/prisma";
import StatCard from "@/components/StatCard";
import GoalProgressBar from "@/components/GoalProgressBar";
import BurndownChart, { type BurndownDataPoint } from "@/components/charts/BurndownChart";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import CategoryStackedBar from "@/components/charts/CategoryStackedBar";
import AnnualPagesChart from "@/components/charts/AnnualPagesChart";
import ConceptForceGraph from "@/components/charts/ConceptForceGraph";
import YearSelector from "@/components/YearSelector";
import ActionLink from "@/components/ActionLink";

function buildBurndownData(
  monthlyPages: { month: number; pages: number }[],
  goal: number,
  currentYear: number,
  viewYear: number
): BurndownDataPoint[] {
  const today = new Date();
  const isCurrentYear = viewYear === currentYear;
  const currentMonth = isCurrentYear ? today.getMonth() + 1 : 12;

  let cumulative = 0;
  const pagesByMonth = new Map(monthlyPages.map((m) => [m.month, m.pages]));

  let cumulativeAtCurrentMonth = 0;
  for (let m = 1; m <= currentMonth; m++) {
    cumulativeAtCurrentMonth += pagesByMonth.get(m) ?? 0;
  }
  const avgPerMonth =
    currentMonth > 0 ? cumulativeAtCurrentMonth / currentMonth : 0;

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthPages = pagesByMonth.get(month) ?? 0;
    const target = goal > 0 ? Math.round((goal / 12) * month) : null;

    let actual: number | null = null;
    let projection: number | null = null;

    if (month <= currentMonth) {
      cumulative += monthPages;
      actual = cumulative;
      if (month === currentMonth && isCurrentYear) {
        projection = cumulative;
      }
    } else if (isCurrentYear) {
      projection = Math.round(
        cumulativeAtCurrentMonth + avgPerMonth * (month - currentMonth)
      );
    }

    return { month: `${month}月`, target, actual, projection };
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

  const [stats, availableYears, yearlyTrend, graphData, yearBooks] = await Promise.all([
    getStatsForYear(year),
    getAvailableYears(),
    getYearlyTrend(),
    getConceptGraph(year),
    prisma.book.findMany({
      where: {
        readAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      select: { id: true, title: true, author: true, readAt: true },
      orderBy: { readAt: "asc" },
    }),
  ]);

  const years = [...new Set([...availableYears, currentYear])].sort((a, b) => b - a);

  // 月ごとの本リスト
  const booksByMonth: Record<number, { id: string; title: string; author: string | null }[]> = {};
  for (const book of yearBooks) {
    if (book.readAt) {
      const m = book.readAt.getMonth() + 1;
      if (!booksByMonth[m]) booksByMonth[m] = [];
      booksByMonth[m].push({ id: book.id, title: book.title, author: book.author });
    }
  }

  const pagesThisMonth = isCurrentYear
    ? (stats.monthlyPages.find((m) => m.month === currentMonth)?.pages ?? 0)
    : undefined;

  const goalPages = stats.goal?.pageGoal ?? 0;
  const burndownData = goalPages > 0
    ? buildBurndownData(stats.monthlyPages, goalPages, currentYear, year)
    : null;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-0.5">{year}年の読書記録</p>
        </div>
        <Suspense>
          <YearSelector years={years} currentYear={year} />
        </Suspense>
      </div>

      {/* ── 1. サマリー ── */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard title="読書数" value={`${stats.totalBooks} 冊`} icon="📚" href="/books?status=READ" />
        <StatCard
          title="読書量"
          value={`${stats.totalPages.toLocaleString()} P`}
          icon="📖"
          sub={stats.totalBooks > 0 ? `平均 ${Math.round(stats.totalPages / stats.totalBooks).toLocaleString()} P/冊` : undefined}
          href="/books?status=READ"
        />
      </div>

      {/* ── 2. 読書計画 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">読書計画</h2>
            <p className="text-xs text-slate-400 mt-0.5">年間目標に対する進捗</p>
          </div>
          <ActionLink
            href="/goals"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors bg-white min-w-[80px] justify-center"
            spinnerClassName="w-3 h-3"
          >
            🎯 目標を設定
          </ActionLink>
        </div>

        {goalPages > 0 ? (
          <>
            {/* 進捗バー */}
            <div className="mb-5">
              {/* 数値サマリー */}
              <div className="flex items-end justify-between mb-2">
                <p className="text-xs text-slate-500">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums">
                    {Math.min(Math.round((stats.totalPages / goalPages) * 100), 100)}
                  </span>
                  <span className="ml-0.5 text-slate-500">%</span>
                </p>
                <p className="text-xs text-slate-400 tabular-nums">
                  {stats.totalPages.toLocaleString()} / {goalPages.toLocaleString()} P
                </p>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((stats.totalPages / goalPages) * 100, 100)}%`,
                    backgroundColor: stats.totalPages >= goalPages ? "#10b981" : "#3b82f6",
                  }}
                />
                {/* 今月末の期待進捗マーカー */}
                {isCurrentYear && stats.totalPages < goalPages && (() => {
                  const expectedPct = (currentMonth / 12) * 100;
                  return (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-slate-400"
                      style={{ left: `${expectedPct}%` }}
                      title={`${currentMonth}月末の期待値: ${Math.round(goalPages * currentMonth / 12).toLocaleString()} P`}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-slate-400">
                  残り {Math.max(goalPages - stats.totalPages, 0).toLocaleString()} P
                </p>
                {/* 今月あと何ページ */}
                {isCurrentYear && pagesThisMonth !== undefined && stats.totalPages < goalPages && (() => {
                  const remaining = goalPages - stats.totalPages;
                  const monthsLeft = 12 - currentMonth + 1;
                  const needed = Math.max(0, Math.ceil(remaining / monthsLeft - pagesThisMonth));
                  return needed > 0 ? (
                    <p className="text-xs text-blue-600 font-medium tabular-nums">
                      今月あと {needed.toLocaleString()} P でペース通り
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 font-medium">今月のペース達成 ✓</p>
                  );
                })()}
              </div>
              {/* 期待値の凡例 */}
              {isCurrentYear && stats.totalPages < goalPages && (
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-slate-400 rounded" />
                  {currentMonth}月末の期待値: {Math.round(goalPages * currentMonth / 12).toLocaleString()} P
                </p>
              )}
            </div>

            {/* バーンチャート */}
            {burndownData && (
              <div>
                <p className="text-xs text-slate-400 mb-3">
                  現在のペースで読み続けると年末に到達する累計ページ数の予測
                </p>
                <BurndownChart data={burndownData} />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-3">今年の目標がまだ設定されていません</p>
            <ActionLink
              href="/goals"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors min-w-[140px] justify-center"
              spinnerClassName="w-4 h-4 text-white"
            >
              🎯 目標を設定する
            </ActionLink>
          </div>
        )}
      </div>

      {/* ── 3. 実績 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-0.5">月別実績</h2>
        <p className="text-xs text-slate-400 mb-4">
          棒グラフをタップするとその月に読んだ本を表示します
        </p>
        <MonthlyBarChart data={stats.monthlyPages} booksByMonth={booksByMonth} />
      </div>

      {/* ── 4. 知識分析 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-0.5">知識分析</h2>
        <p className="text-xs text-slate-400 mb-4">{year}年のカテゴリ内訳と概念ネットワーク</p>

        {/* カテゴリ横積み上げバー */}
        {stats.categoryTotals.length > 0 ? (
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-500 mb-2">カテゴリ内訳</p>
            <CategoryStackedBar data={stats.categoryTotals} />
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-5">カテゴリデータがありません</p>
        )}

        {/* 知識の地形図 */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">知識の地形図</p>
          <p className="text-xs text-slate-400 mb-3">
            円サイズ＝蓄積量、線＝同じ本で共起した関係、色＝ピーク年（青い＝古くから、橙い＝最近）
          </p>
          <ConceptForceGraph data={graphData} />
        </div>
      </div>

      {/* ── 5. 年別推移（全年度） ── */}
      {yearlyTrend.length >= 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-0.5">年別推移</h2>
          <p className="text-xs text-slate-400 mb-4">
            全年度の読書量（緑＝目標達成、青＝未達成、灰＝目標未設定）
            — 橙の点が目標値
          </p>
          <AnnualPagesChart data={yearlyTrend} />
        </div>
      )}

    </div>
  );
}
