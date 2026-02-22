export const dynamic = "force-dynamic";

import { getConceptGraph, getConceptBump } from "@/lib/concepts";
import { getKeywordHeatmap } from "@/lib/keywords";
import { getDisciplineBump } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { API_ERROR_SENTINEL } from "@/lib/keyword-extractor";
import ConceptForceGraph from "@/components/charts/ConceptForceGraph";
import ConceptBumpChart from "@/components/charts/ConceptBumpChart";
import DisciplineBumpChart from "@/components/charts/DisciplineBumpChart";
import VocabRefreshButton from "@/components/VocabRefreshButton";

export default async function AnalyticsPage() {
  const [graphData, bumpData, keywordData, disciplineBumpData, pendingBooks] = await Promise.all([
    getConceptGraph(),
    getConceptBump(),
    getKeywordHeatmap(),
    getDisciplineBump(),
    prisma.book.findMany({
      where: {
        readAt: { not: null },
        NOT: { keywords: { some: { keyword: { not: API_ERROR_SENTINEL } } } },
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const pendingCount = pendingBooks.length;

  // --- 静的サマリーテキスト ---
  const top3 = graphData.nodes.slice(0, 3).map((n) => n.concept);

  // 最も多くの概念と共起しているノード（degree中心性）
  const degree: Record<string, number> = {};
  for (const e of graphData.edges) {
    degree[e.source] = (degree[e.source] ?? 0) + 1;
    degree[e.target] = (degree[e.target] ?? 0) + 1;
  }
  const hubConcept = Object.entries(degree).sort((a, b) => b[1] - a[1])[0]?.[0];

  // --- 動的サマリーテキスト ---
  // 最近2年で急上昇した概念（ランクが上がったもの）
  const years = bumpData.years;
  let risingConcepts: string[] = [];
  if (years.length >= 2) {
    const recentYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    const recentData = bumpData.data.find((d) => d.year === recentYear);
    const prevData = bumpData.data.find((d) => d.year === prevYear);
    if (recentData && prevData) {
      risingConcepts = bumpData.concepts
        .filter((c) => {
          const rRank = recentData.ranks[c];
          const pRank = prevData.ranks[c];
          return rRank !== undefined && pRank !== undefined && rRank < pRank;
        })
        .sort((a, b) => {
          const ra = recentData.ranks[a] ?? 99;
          const rb = recentData.ranks[b] ?? 99;
          const pa = prevData.ranks[a] ?? 99;
          const pb = prevData.ranks[b] ?? 99;
          return (ra - pa) - (rb - pb); // 上昇幅が大きい順
        })
        .slice(0, 3);
    }
  }

  // 複数年にわたって登場している安定した概念
  const stableConcepts = bumpData.concepts
    .filter((c) => {
      const appearedYears = bumpData.data.filter((d) => d.ranks[c] !== undefined).length;
      return appearedYears >= Math.max(2, years.length - 1);
    })
    .slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">
      {keywordData.hasApiError && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠️ 概念抽出に失敗している本があります（{pendingCount}冊）</p>
          <p className="text-amber-700 text-xs leading-relaxed mb-3">
            APIエラーにより概念を抽出できませんでした。下のボタンで再試行するか、クレジット残高を確認してください。
          </p>
          {pendingBooks.length > 0 && (
            <ul className="text-xs text-amber-800 space-y-0.5 mb-1">
              {pendingBooks.map((b) => (
                <li key={b.id} className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-px shrink-0">•</span>
                  <span>{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">知の変遷</h1>
          <p className="text-slate-500 text-sm mt-0.5">蓄積してきた概念の地形と変遷</p>
        </div>
        <VocabRefreshButton pendingCount={pendingCount} pendingBooks={pendingBooks} />
      </div>

      {/* ── 静的：知識の地形図 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-0.5">知識の地形図</h2>
        <p className="text-xs text-slate-400 mb-1">
          円のサイズ＝蓄積量、線＝同じ本で共起した関係、色＝ピーク年（青い＝古くから、橙い＝最近）
        </p>
        {top3.length > 0 && (
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            最も蓄積されている概念は
            {top3.map((c, i) => (
              <span key={c}>
                {i > 0 && "・"}
                <span className="font-semibold text-slate-700">「{c}」</span>
              </span>
            ))}
            。
            {hubConcept && (
              <> 最も多くの概念と連動しているのは<span className="font-semibold text-slate-700">「{hubConcept}」</span>です。</>
            )}
          </p>
        )}
        <ConceptForceGraph data={graphData} />
      </div>

      {/* ── 動的：思考の変遷 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-0.5">思考の変遷</h2>
        <p className="text-xs text-slate-400 mb-1">
          上位{bumpData.concepts.length}概念の年別ランク推移（上位＝より多く読んだ年）
        </p>
        {(risingConcepts.length > 0 || stableConcepts.length > 0) && (
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            {risingConcepts.length > 0 && (
              <>
                直近で急浮上した概念：
                {risingConcepts.map((c, i) => (
                  <span key={c}>{i > 0 && "・"}<span className="font-semibold text-slate-700">「{c}」</span></span>
                ))}。{" "}
              </>
            )}
            {stableConcepts.length > 0 && (
              <>
                長期にわたって探求している概念：
                {stableConcepts.map((c, i) => (
                  <span key={c}>{i > 0 && "・"}<span className="font-semibold text-slate-700">「{c}」</span></span>
                ))}。
              </>
            )}
          </p>
        )}
        <ConceptBumpChart data={bumpData} />
      </div>

      {/* ── 学問分野の変遷 ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 lg:mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-0.5">学問分野の変遷</h2>
        <p className="text-xs text-slate-400 mb-4">
          上位{disciplineBumpData.disciplines.length}分野の年別ランク推移（上位＝その年により多く読んだ分野）
        </p>
        <DisciplineBumpChart data={disciplineBumpData} />
      </div>
    </div>
  );
}
