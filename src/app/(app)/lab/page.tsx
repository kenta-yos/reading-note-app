export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InsightsSection from "@/components/lab/InsightsSection";
import RecommendSection from "@/components/lab/RecommendSection";

export default async function LabPage() {
  const [insights, sessions] = await Promise.all([
    prisma.readingInsight.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.recommendSession.findMany({
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

  const recommendHistory = sessions.map((s) => ({
    id: s.id,
    recommendations: s.recommendations as {
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
    }[],
    searchType: s.searchType,
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
        <InsightsSection history={insightHistory} />
        <RecommendSection history={recommendHistory} />
      </div>
    </div>
  );
}
