import { getStatsForYear, getStatsForAllYears, getAvailableYears } from "@/lib/stats";
import KnowledgeRadarChart from "@/components/charts/KnowledgeRadarChart";
import ReadingTimelineChart from "@/components/charts/ReadingTimelineChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import YearSelector from "@/components/YearSelector";
import { Suspense } from "react";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const yearParam = params.year ?? String(currentYear);
  const isAllYears = yearParam === "all";
  const year = isAllYears ? "all" : parseInt(yearParam);

  const [stats, availableYears] = await Promise.all([
    isAllYears ? getStatsForAllYears() : getStatsForYear(year as number),
    getAvailableYears(),
  ]);
  const years = [...new Set([...availableYears, currentYear])].sort((a, b) => b - a);
  const categories = stats.categoryTotals.map((c) => c.category);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">知識分析</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAllYears ? "全期間" : `${year}年`}の読書パターンを分析
          </p>
        </div>
        <Suspense>
          <YearSelector years={years} currentYear={year} showAllOption />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            知識レーダー（カテゴリ別強度）
          </h2>
          <KnowledgeRadarChart data={stats.categoryTotals} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">
            カテゴリ分布
          </h2>
          <CategoryPieChart data={stats.categoryTotals} />
        </div>

        {!isAllYears && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-600 mb-4">
              月別カテゴリ推移
            </h2>
            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                データがありません
              </p>
            ) : (
              <ReadingTimelineChart
                data={stats.monthlyByCategory}
                categories={categories}
              />
            )}
          </div>
        )}
      </div>

      {/* Category detail table */}
      {stats.categoryTotals.length > 0 && (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  カテゴリ
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">
                  冊数
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">
                  ページ数
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.categoryTotals
                .sort((a, b) => b.pages - a.pages)
                .map((cat) => (
                  <tr key={cat.category} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {cat.category}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {cat.count} 冊
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {cat.pages.toLocaleString()} P
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
