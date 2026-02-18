import { getStatsForYear, getAvailableYears } from "@/lib/stats";
import StatCard from "@/components/StatCard";
import GoalProgressBar from "@/components/GoalProgressBar";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import YearSelector from "@/components/YearSelector";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = params.year ? parseInt(params.year) : currentYear;

  const [stats, availableYears] = await Promise.all([
    getStatsForYear(year),
    getAvailableYears(),
  ]);

  const years = [...new Set([...availableYears, currentYear])].sort((a, b) => b - a);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-0.5">{year}年の読書状況</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearSelector years={years} currentYear={year} />
          </Suspense>
          <Link
            href="/books/new"
            className="px-3 py-2 lg:px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            本を登録
          </Link>
        </div>
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
          />
        </div>
      )}

      {!stats.goal && (
        <div className="mb-5 lg:mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          年間目標が未設定です。{" "}
          <Link href="/goals" className="font-semibold underline">
            目標を設定する
          </Link>
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
    </div>
  );
}
