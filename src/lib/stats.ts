import { prisma } from "./prisma";
import vocabulary from "./concept-vocabulary.json";
import { API_ERROR_SENTINEL, NO_CONCEPTS_SENTINEL } from "./keyword-extractor";
import type {
  StatsResponse,
  MonthlyPages,
  CategoryTotal,
  MonthlyByCategory,
  CategoryEvolutionData,
  CategoryEvolutionPoint,
} from "./types";

export type DisciplineEvolutionPoint = { year: number; [discipline: string]: number };
export type DisciplineEvolutionData = {
  years: number[];
  disciplines: string[];
  data: DisciplineEvolutionPoint[];
  totalByDiscipline: { discipline: string; pages: number; count: number }[];
};

export type DisciplineBumpData = {
  years: number[];
  disciplines: string[];
  data: { year: number; ranks: { [d: string]: number } }[];
};

export async function getAvailableYears(): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM "readAt")::int AS year
    FROM "Book"
    WHERE "readAt" IS NOT NULL
    ORDER BY year DESC
  `;
  return rows.map((r) => r.year);
}

export async function getStatsForAllYears(): Promise<StatsResponse> {
  const [aggregation, categoryRows] = await Promise.all([
    prisma.book.aggregate({
      _count: { id: true },
      _sum: { pages: true },
    }),
    prisma.$queryRaw<{ category: string; pages: bigint; count: bigint }[]>`
      SELECT COALESCE(category, 'その他') AS category,
             COALESCE(SUM(pages), 0) AS pages,
             COUNT(*) AS count
      FROM "Book"
      GROUP BY COALESCE(category, 'その他')
    `,
  ]);

  const categoryTotals: CategoryTotal[] = categoryRows.map((r) => ({
    category: r.category,
    pages: Number(r.pages),
    count: Number(r.count),
  }));

  return {
    totalBooks: aggregation._count.id,
    totalPages: aggregation._sum.pages ?? 0,
    monthlyPages: [],
    categoryTotals,
    monthlyByCategory: [],
    goal: null,
  };
}

export async function getStatsForYear(year: number): Promise<StatsResponse> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const [aggregation, monthlyRows, categoryRows, monthlyCatRows, goal] = await Promise.all([
    prisma.book.aggregate({
      where: { readAt: { gte: startDate, lt: endDate } },
      _count: { id: true },
      _sum: { pages: true },
    }),
    prisma.$queryRaw<{ month: number; pages: bigint }[]>`
      SELECT EXTRACT(MONTH FROM "readAt")::int AS month,
             COALESCE(SUM(pages), 0) AS pages
      FROM "Book"
      WHERE "readAt" >= ${startDate} AND "readAt" < ${endDate}
      GROUP BY month
    `,
    prisma.$queryRaw<{ category: string; pages: bigint; count: bigint }[]>`
      SELECT COALESCE(category, 'その他') AS category,
             COALESCE(SUM(pages), 0) AS pages,
             COUNT(*) AS count
      FROM "Book"
      WHERE "readAt" >= ${startDate} AND "readAt" < ${endDate}
      GROUP BY COALESCE(category, 'その他')
    `,
    prisma.$queryRaw<{ month: number; category: string; pages: bigint }[]>`
      SELECT EXTRACT(MONTH FROM "readAt")::int AS month,
             COALESCE(category, 'その他') AS category,
             COALESCE(SUM(pages), 0) AS pages
      FROM "Book"
      WHERE "readAt" >= ${startDate} AND "readAt" < ${endDate}
      GROUP BY month, COALESCE(category, 'その他')
    `,
    prisma.annualGoal.findUnique({ where: { year } }),
  ]);

  // Monthly pages (ensure all 12 months present)
  const monthlyMap = new Map<number, number>();
  for (let m = 1; m <= 12; m++) monthlyMap.set(m, 0);
  for (const r of monthlyRows) monthlyMap.set(r.month, Number(r.pages));
  const monthlyPages: MonthlyPages[] = Array.from(monthlyMap.entries()).map(
    ([month, pages]) => ({ month, pages })
  );

  const categoryTotals: CategoryTotal[] = categoryRows.map((r) => ({
    category: r.category,
    pages: Number(r.pages),
    count: Number(r.count),
  }));

  // Monthly by category
  const monthlyCatMap = new Map<number, Record<string, number>>();
  for (let m = 1; m <= 12; m++) monthlyCatMap.set(m, {});
  for (const r of monthlyCatRows) {
    const entry = monthlyCatMap.get(r.month)!;
    entry[r.category] = Number(r.pages);
  }
  const monthlyByCategory: MonthlyByCategory[] = Array.from(
    monthlyCatMap.entries()
  ).map(([month, cats]) => ({ month, ...cats }));

  return {
    totalBooks: aggregation._count.id,
    totalPages: aggregation._sum.pages ?? 0,
    monthlyPages,
    categoryTotals,
    monthlyByCategory,
    goal,
  };
}

const MAX_EVOLUTION_CATEGORIES = 8;

export async function getCategoryEvolution(): Promise<CategoryEvolutionData> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { readAt: true, category: true, pages: true },
    orderBy: { readAt: "asc" },
  });

  // year -> category -> pages
  const yearCatMap = new Map<number, Map<string, number>>();
  for (const book of books) {
    const year = book.readAt!.getFullYear();
    const cat  = book.category ?? "その他";
    if (!yearCatMap.has(year)) yearCatMap.set(year, new Map());
    const catMap = yearCatMap.get(year)!;
    catMap.set(cat, (catMap.get(cat) ?? 0) + (book.pages ?? 0));
  }

  // 全年度合計でランキング
  const globalTotals = new Map<string, number>();
  for (const catMap of yearCatMap.values())
    for (const [cat, pages] of catMap.entries())
      globalTotals.set(cat, (globalTotals.get(cat) ?? 0) + pages);

  const allCats  = [...globalTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topCats  = allCats.slice(0, MAX_EVOLUTION_CATEGORIES).map(([c]) => c);
  const restCats = allCats.slice(MAX_EVOLUTION_CATEGORIES).map(([c]) => c);
  const hasRest  = restCats.length > 0;
  const categories = hasRest ? [...topCats, "その他"] : topCats;

  const years = [...yearCatMap.keys()].sort((a, b) => a - b);
  const data: CategoryEvolutionPoint[] = years.map((year) => {
    const catMap = yearCatMap.get(year)!;
    const row: CategoryEvolutionPoint = { year };
    for (const cat of topCats) row[cat] = catMap.get(cat) ?? 0;
    if (hasRest)
      row["その他"] = restCats.reduce((s, c) => s + (catMap.get(c) ?? 0), 0);
    return row;
  });

  return { years, categories, data };
}

export async function getDisciplineEvolution(): Promise<DisciplineEvolutionData> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { readAt: true, discipline: true, pages: true },
    orderBy: { readAt: "asc" },
  });

  const yearDiscMap = new Map<number, Map<string, number>>();
  const globalTotals = new Map<string, { pages: number; count: number }>();

  for (const book of books) {
    const year = book.readAt!.getFullYear();
    const disc = book.discipline ?? "未分類";
    if (!yearDiscMap.has(year)) yearDiscMap.set(year, new Map());
    const discMap = yearDiscMap.get(year)!;
    discMap.set(disc, (discMap.get(disc) ?? 0) + (book.pages ?? 0));

    const prev = globalTotals.get(disc) ?? { pages: 0, count: 0 };
    globalTotals.set(disc, { pages: prev.pages + (book.pages ?? 0), count: prev.count + 1 });
  }

  const allDiscs = [...globalTotals.entries()].sort((a, b) => b[1].pages - a[1].pages);
  const disciplines = allDiscs.map(([d]) => d);

  const years = [...yearDiscMap.keys()].sort((a, b) => a - b);
  const data: DisciplineEvolutionPoint[] = years.map((year) => {
    const discMap = yearDiscMap.get(year)!;
    const row: DisciplineEvolutionPoint = { year };
    for (const disc of disciplines) row[disc] = discMap.get(disc) ?? 0;
    return row;
  });

  const totalByDiscipline = allDiscs.map(([discipline, { pages, count }]) => ({
    discipline,
    pages,
    count,
  }));

  return { years, disciplines, data, totalByDiscipline };
}

export type DisciplineTotal = {
  discipline: string;
  pages: number;
  count: number;
};

/** 全期間の学問分野別合計（レーダーチャート用）*/
export async function getDisciplineTotals(): Promise<DisciplineTotal[]> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { discipline: true, pages: true },
  });

  const map = new Map<string, { pages: number; count: number }>();
  for (const book of books) {
    const disc = book.discipline;
    if (!disc || disc === "未分類") continue;
    const prev = map.get(disc) ?? { pages: 0, count: 0 };
    map.set(disc, { pages: prev.pages + (book.pages ?? 0), count: prev.count + 1 });
  }

  return [...map.entries()]
    .sort((a, b) => b[1].pages - a[1].pages)
    .map(([discipline, { pages, count }]) => ({ discipline, pages, count }));
}

const MAX_BUMP_DISCIPLINES = 12;

export async function getDisciplineBump(): Promise<DisciplineBumpData> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { readAt: true, discipline: true },
    orderBy: { readAt: "asc" },
  });

  const yearDiscMap = new Map<number, Map<string, number>>();
  const globalCount = new Map<string, number>();

  for (const book of books) {
    const year = book.readAt!.getFullYear();
    const disc = book.discipline ?? "未分類";
    if (disc === "未分類") continue;
    if (!yearDiscMap.has(year)) yearDiscMap.set(year, new Map());
    const discMap = yearDiscMap.get(year)!;
    discMap.set(disc, (discMap.get(disc) ?? 0) + 1);
    globalCount.set(disc, (globalCount.get(disc) ?? 0) + 1);
  }

  const disciplines = [...globalCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_BUMP_DISCIPLINES)
    .map(([d]) => d);

  const years = [...yearDiscMap.keys()].sort((a, b) => a - b);

  const data = years.map((year) => {
    const discMap = yearDiscMap.get(year)!;
    const appeared = disciplines
      .map((d) => ({ d, cnt: discMap.get(d) ?? 0 }))
      .filter((x) => x.cnt > 0)
      .sort((a, b) => b.cnt - a.cnt);
    const ranks: { [d: string]: number } = {};
    appeared.forEach((x, i) => {
      ranks[x.d] = i + 1;
    });
    return { year, ranks };
  });

  return { years, disciplines, data };
}

// ─── 語彙健全性指標 ───────────────────────────────────────────

export type VocabHealthData = {
  /** 全期間の語彙適合率（0〜1）。2語彙以上マッチで「マッチ」とみなす */
  matchRate: number;
  /** 直近2年の語彙適合率（0〜1） */
  recentMatchRate: number;
  /** 処理済み冊数（API成功）*/
  totalProcessed: number;
  /** 語彙が2つ以上マッチした冊数 */
  totalMatched: number;
  /** 語彙に一致なし（またはマッチ1つ以下）の冊数 */
  totalNoMatch: number;
  /** 語彙外で抽出された概念（頻度降順） */
  outOfVocabConcepts: { concept: string; count: number }[];
  /** 年別適合率 */
  yearlyRates: { year: number; rate: number; total: number }[];
  /** 語彙不一致の書籍一覧 */
  noMatchBooks: { id: string; title: string }[];
};

export async function getVocabHealth(): Promise<VocabHealthData> {
  const vocabSet = new Set(vocabulary as string[]);
  const SENTINEL_SET = new Set([API_ERROR_SENTINEL, NO_CONCEPTS_SENTINEL]);

  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: {
      id: true,
      title: true,
      readAt: true,
      keywords: { select: { keyword: true } },
    },
  });

  let totalMatched = 0;
  let totalNoMatch = 0;
  const yearData = new Map<number, { matched: number; noMatch: number }>();
  const outOfVocabCount = new Map<string, number>();
  const noMatchBooks: { id: string; title: string }[] = [];

  for (const book of books) {
    const keywords = book.keywords.map((k) => k.keyword);
    const realKeywords = keywords.filter((k) => !SENTINEL_SET.has(k));
    const hasNoConceptsSentinel = keywords.includes(NO_CONCEPTS_SENTINEL);
    const isApiError =
      keywords.includes(API_ERROR_SENTINEL) &&
      realKeywords.length === 0 &&
      !hasNoConceptsSentinel;

    // APIエラー状態・未処理はスキップ（語彙の問題ではない）
    if (keywords.length === 0 || isApiError) continue;

    const year = book.readAt!.getFullYear();
    if (!yearData.has(year)) yearData.set(year, { matched: 0, noMatch: 0 });

    if (realKeywords.length > 0) {
      const vocabMatchCount = realKeywords.filter((k) => vocabSet.has(k)).length;
      if (vocabMatchCount >= 2) {
        totalMatched++;
        yearData.get(year)!.matched++;
      } else {
        // 語彙外概念のみ、またはマッチ1つ以下
        totalNoMatch++;
        yearData.get(year)!.noMatch++;
        noMatchBooks.push({ id: book.id, title: book.title });
      }
      // 語彙外概念を集計
      for (const k of realKeywords) {
        if (!vocabSet.has(k)) {
          outOfVocabCount.set(k, (outOfVocabCount.get(k) ?? 0) + 1);
        }
      }
    } else if (hasNoConceptsSentinel) {
      // API成功だが語彙リストに一致する概念なし
      totalNoMatch++;
      yearData.get(year)!.noMatch++;
      noMatchBooks.push({ id: book.id, title: book.title });
    }
  }

  const totalProcessed = totalMatched + totalNoMatch;
  const matchRate = totalProcessed > 0 ? totalMatched / totalProcessed : 1;

  // 直近2年の適合率
  const allYears = [...yearData.keys()].sort((a, b) => a - b);
  const recentYears = allYears.slice(-2);
  let recentMatched = 0;
  let recentTotal = 0;
  for (const yr of recentYears) {
    const d = yearData.get(yr)!;
    recentMatched += d.matched;
    recentTotal += d.matched + d.noMatch;
  }
  const recentMatchRate =
    recentTotal > 0 ? recentMatched / recentTotal : matchRate;

  const outOfVocabConcepts = [...outOfVocabCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([concept, count]) => ({ concept, count }));

  const yearlyRates = allYears.map((yr) => {
    const d = yearData.get(yr)!;
    const total = d.matched + d.noMatch;
    return { year: yr, rate: total > 0 ? d.matched / total : 1, total };
  });

  return {
    matchRate,
    recentMatchRate,
    totalProcessed,
    totalMatched,
    totalNoMatch,
    outOfVocabConcepts,
    yearlyRates,
    noMatchBooks,
  };
}

export async function getYearlyTrend(): Promise<
  { year: number; pages: number; goal: number | null }[]
> {
  const [yearRows, goals] = await Promise.all([
    prisma.$queryRaw<{ year: number; pages: bigint }[]>`
      SELECT EXTRACT(YEAR FROM "readAt")::int AS year,
             COALESCE(SUM(pages), 0) AS pages
      FROM "Book"
      WHERE "readAt" IS NOT NULL
      GROUP BY year
      ORDER BY year
    `,
    prisma.annualGoal.findMany(),
  ]);

  const goalMap = new Map(goals.map((g) => [g.year, g.pageGoal]));

  return yearRows.map((r) => ({
    year: r.year,
    pages: Number(r.pages),
    goal: goalMap.get(r.year) ?? null,
  }));
}
