import { getStatsForYear } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import StatCard from "@/components/StatCard";
import GoalProgressBar from "@/components/GoalProgressBar";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import Link from "next/link";

export default async function DashboardPage() {
  const year = new Date().getFullYear();
  const stats = await getStatsForYear(year);

  const recentBooks = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-1">{year}年の読書状況</p>
        </div>
        <Link
          href="/books/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          本を登録
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="今年の読書数" value={`${stats.totalBooks} 冊`} icon="📚" />
        <StatCard
          title="今年の読書量"
          value={`${stats.totalPages.toLocaleString()} P`}
          icon="📖"
        />
        <StatCard
          title="カテゴリ数"
          value={`${stats.categoryTotals.length} 分野`}
          icon="🗂️"
        />
        <StatCard
          title="タグ種類"
          value={`${stats.tagFrequencies.length} タグ`}
          icon="🏷️"
        />
      </div>

      {/* Goal */}
      {stats.goal && (
        <div className="mb-6">
          <GoalProgressBar
            current={stats.totalPages}
            goal={stats.goal.pageGoal}
            year={year}
          />
        </div>
      )}

      {!stats.goal && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          年間目標が未設定です。{" "}
          <Link href="/goals" className="font-semibold underline">
            目標を設定する
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">月別読書ページ数</h2>
          <MonthlyBarChart data={stats.monthlyPages} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-600 mb-4">カテゴリ分布</h2>
          <CategoryPieChart data={stats.categoryTotals} />
        </div>
      </div>

      {/* Recent books */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600">最近登録した本</h2>
          <Link href="/books" className="text-xs text-blue-600 hover:underline">
            すべて見る
          </Link>
        </div>
        {recentBooks.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            まだ本が登録されていません
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentBooks.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/books/${book.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">{book.title}</p>
                    <p className="text-xs text-slate-400">
                      {book.author ?? "著者不明"} · {book.category ?? "未分類"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{book.pages} P</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
