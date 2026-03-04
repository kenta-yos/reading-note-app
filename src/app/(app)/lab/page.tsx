export const revalidate = 120;

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InsightsSection from "@/components/lab/InsightsSection";
import RecommendSection from "@/components/lab/RecommendSection";
import SearchSection from "@/components/lab/SearchSection";

export default async function LabPage() {
  const [insights, autoSessions, searchSessions] = await Promise.all([
    prisma.readingInsight.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.recommendSession.findMany({
      where: { searchType: "auto" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.recommendSession.findMany({
      where: { searchType: "search" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const insightHistory = insights.map((i) => ({
    id: i.id,
    analysis: i.analysis as {
      discoveries: { title: string; books: string[]; insight: string }[];
      evolution: {
        period: string;
        theme: string;
        description: string;
        keyBooks: string[];
      }[];
    },
    bookCount: i.bookCount,
    createdAt: i.createdAt.toISOString(),
  }));

  type Rec = {
    type: "book" | "paper";
    title: string;
    titleJa?: string;
    author: string;
    publisher?: string;
    year: string;
    isbn?: string;
    url?: string;
    openAccessPdfUrl?: string;
    reason: string;
    reasonJa?: string;
  };

  const recommendHistory = autoSessions.map((s) => ({
    id: s.id,
    recommendations: s.recommendations as Rec[],
    createdAt: s.createdAt.toISOString(),
  }));

  const searchHistory = searchSessions.map((s) => ({
    id: s.id,
    recommendations: s.recommendations as Rec[],
    userQuery: s.userQuery ?? undefined,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/analytics"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            知識分析
          </Link>
          <span className="text-xs text-slate-300">/</span>
          <span className="text-xs text-slate-500">読書ラボ</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
          読書ラボ
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          読書記録をAIで分析し、新しい発見やおすすめの本・論文を見つける実験機能
        </p>
      </div>

      <div className="space-y-6 lg:space-y-8">
        <SearchSection history={searchHistory} />
        <RecommendSection history={recommendHistory} />
        <InsightsSection history={insightHistory} />
      </div>
    </div>
  );
}
