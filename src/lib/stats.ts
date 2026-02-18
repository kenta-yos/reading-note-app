import { prisma } from "./prisma";
import type {
  StatsResponse,
  MonthlyPages,
  CategoryTotal,
  TagFrequency,
  MonthlyByCategory,
} from "./types";

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

  // Tag frequencies
  const tagMap = new Map<string, number>();
  for (const book of books) {
    for (const tag of book.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  const tagFrequencies: TagFrequency[] = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

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
    tagFrequencies,
    monthlyByCategory,
    goal,
  };
}
