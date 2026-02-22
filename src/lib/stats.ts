import { prisma } from "./prisma";
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
  const books = await prisma.book.findMany({ orderBy: { readAt: "asc" } });

  const totalBooks = books.length;
  const totalPages = books.reduce((sum, b) => sum + b.pages, 0);

  const categoryMap = new Map<string, { pages: number; count: number }>();
  for (const book of books) {
    const cat = book.category ?? "その他";
    const prev = categoryMap.get(cat) ?? { pages: 0, count: 0 };
    categoryMap.set(cat, { pages: prev.pages + book.pages, count: prev.count + 1 });
  }
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries()).map(
    ([category, { pages, count }]) => ({ category, pages, count })
  );

  return {
    totalBooks,
    totalPages,
    monthlyPages: [],
    categoryTotals,
    monthlyByCategory: [],
    goal: null,
  };
}

export async function getStatsForYear(year: number): Promise<StatsResponse> {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const [books, goal] = await Promise.all([
    prisma.book.findMany({
      where: {
        readAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { readAt: "asc" },
    }),
    prisma.annualGoal.findUnique({ where: { year } }),
  ]);

  const totalBooks = books.length;
  const totalPages = books.reduce((sum, b) => sum + b.pages, 0);

  // Monthly pages
  const monthlyMap = new Map<number, number>();
  for (let m = 1; m <= 12; m++) monthlyMap.set(m, 0);
  for (const book of books) {
    if (book.readAt) {
      const month = book.readAt.getMonth() + 1;
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + book.pages);
    }
  }
  const monthlyPages: MonthlyPages[] = Array.from(monthlyMap.entries()).map(
    ([month, pages]) => ({ month, pages })
  );

  // Category totals
  const categoryMap = new Map<string, { pages: number; count: number }>();
  for (const book of books) {
    const cat = book.category ?? "その他";
    const prev = categoryMap.get(cat) ?? { pages: 0, count: 0 };
    categoryMap.set(cat, { pages: prev.pages + book.pages, count: prev.count + 1 });
  }
  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries()).map(
    ([category, { pages, count }]) => ({ category, pages, count })
  );

  // Monthly by category
  const monthlyCatMap = new Map<number, Record<string, number>>();
  for (let m = 1; m <= 12; m++) monthlyCatMap.set(m, {});
  for (const book of books) {
    if (book.readAt) {
      const month = book.readAt.getMonth() + 1;
      const cat = book.category ?? "その他";
      const entry = monthlyCatMap.get(month)!;
      entry[cat] = (entry[cat] ?? 0) + book.pages;
    }
  }
  const monthlyByCategory: MonthlyByCategory[] = Array.from(
    monthlyCatMap.entries()
  ).map(([month, cats]) => ({ month, ...cats }));

  return {
    totalBooks,
    totalPages,
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
    catMap.set(cat, (catMap.get(cat) ?? 0) + book.pages);
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
    discMap.set(disc, (discMap.get(disc) ?? 0) + book.pages);

    const prev = globalTotals.get(disc) ?? { pages: 0, count: 0 };
    globalTotals.set(disc, { pages: prev.pages + book.pages, count: prev.count + 1 });
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
