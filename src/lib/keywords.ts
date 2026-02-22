import { prisma } from "./prisma";
import { extractAndStoreKeywords, API_ERROR_SENTINEL } from "./keyword-extractor";

export type KeywordByYear = {
  year: number;
  keyword: string;
  count: number;
};

export type KeywordHeatmapData = {
  years: number[];
  keywords: string[];
  matrix: Record<string, Record<number, number>>;
  hasApiError: boolean;
};

const TOP_KEYWORDS = 20;

export async function getKeywordHeatmap(): Promise<KeywordHeatmapData> {
  // 遅延抽出：実キーワードがない本（未処理 or 前回失敗）を対象に再試行
  const unprocessed = await prisma.book.findMany({
    where: {
      readAt: { not: null },
      // 実キーワード（センチネル以外）が1件もない本
      NOT: { keywords: { some: { keyword: { not: API_ERROR_SENTINEL } } } },
    },
    select: { id: true, title: true, notes: true },
  });

  let hasApiError = false;
  if (unprocessed.length > 0) {
    const result = await extractAndStoreKeywords(unprocessed);
    if (result.hasError) hasApiError = true;
  }

  // 前回失敗のまま残っているセンチネルがあればエラー表示を維持
  if (!hasApiError) {
    const sentinelCount = await prisma.bookKeyword.count({
      where: { keyword: API_ERROR_SENTINEL },
    });
    if (sentinelCount > 0) hasApiError = true;
  }

  // センチネルを除いたキーワードでヒートマップを構築
  const rows = await prisma.bookKeyword.findMany({
    where: {
      book: { readAt: { not: null } },
      keyword: { not: API_ERROR_SENTINEL },
    },
    select: {
      keyword: true,
      count: true,
      book: { select: { readAt: true } },
    },
  });

  const matrix: Record<string, Record<number, number>> = {};
  const globalTotals: Record<string, number> = {};
  const yearSet = new Set<number>();

  for (const row of rows) {
    const year = row.book.readAt!.getFullYear();
    yearSet.add(year);

    if (!matrix[row.keyword]) matrix[row.keyword] = {};
    matrix[row.keyword][year] = (matrix[row.keyword][year] ?? 0) + row.count;
    globalTotals[row.keyword] = (globalTotals[row.keyword] ?? 0) + row.count;
  }

  const years = [...yearSet].sort((a, b) => a - b);

  const keywords = Object.entries(globalTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_KEYWORDS)
    .map(([k]) => k);

  for (const kw of keywords) {
    for (const yr of years) {
      matrix[kw][yr] ??= 0;
    }
  }

  return { years, keywords, matrix, hasApiError };
}
