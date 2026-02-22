import { prisma } from "./prisma";
import { API_ERROR_SENTINEL } from "./keyword-extractor";

const TOP_CONCEPTS = 30;
const MIN_COOCCURRENCE = 2;
const MAX_EDGES = 60;

export type ConceptNode = {
  concept: string;
  totalCount: number;
  peakYear: number;
};

export type ConceptEdge = {
  source: string;
  target: string;
  strength: number;
};

export type ConceptGraphData = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  minYear: number;
  maxYear: number;
};

export type ConceptRankYear = {
  year: number;
  ranks: Record<string, number>; // concept -> rank (1-based), absent if not ranked
};

export type ConceptBumpData = {
  years: number[];
  concepts: string[];
  data: ConceptRankYear[];
};

export async function getConceptGraph(): Promise<ConceptGraphData> {
  const rows = await prisma.bookKeyword.findMany({
    where: {
      keyword: { not: API_ERROR_SENTINEL },
      book: { readAt: { not: null } },
    },
    select: {
      keyword: true,
      bookId: true,
      count: true,
      book: { select: { readAt: true } },
    },
  });

  // total count and per-year count per concept
  const totalCounts: Record<string, number> = {};
  const yearCounts: Record<string, Record<number, number>> = {};

  for (const row of rows) {
    totalCounts[row.keyword] = (totalCounts[row.keyword] ?? 0) + row.count;
    const year = row.book.readAt!.getFullYear();
    if (!yearCounts[row.keyword]) yearCounts[row.keyword] = {};
    yearCounts[row.keyword][year] =
      (yearCounts[row.keyword][year] ?? 0) + row.count;
  }

  const topConcepts = Object.entries(totalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CONCEPTS)
    .map(([c]) => c);

  const topConceptSet = new Set(topConcepts);

  const allYears = [
    ...new Set(rows.map((r) => r.book.readAt!.getFullYear())),
  ].sort((a, b) => a - b);

  const nodes: ConceptNode[] = topConcepts.map((concept) => {
    const yearMap = yearCounts[concept] ?? {};
    const peakYear =
      Object.entries(yearMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "0";
    return {
      concept,
      totalCount: totalCounts[concept],
      peakYear: parseInt(peakYear),
    };
  });

  // co-occurrence: group by bookId, only top concepts
  const bookKeywords: Record<string, string[]> = {};
  for (const row of rows) {
    if (!topConceptSet.has(row.keyword)) continue;
    if (!bookKeywords[row.bookId]) bookKeywords[row.bookId] = [];
    bookKeywords[row.bookId].push(row.keyword);
  }

  const cooccurrence: Record<string, number> = {};
  for (const keywords of Object.values(bookKeywords)) {
    const unique = [...new Set(keywords)].sort();
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = `${unique[i]}:::${unique[j]}`;
        cooccurrence[key] = (cooccurrence[key] ?? 0) + 1;
      }
    }
  }

  const edges: ConceptEdge[] = Object.entries(cooccurrence)
    .filter(([, v]) => v >= MIN_COOCCURRENCE)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_EDGES)
    .map(([key, strength]) => {
      const [source, target] = key.split(":::");
      return { source, target, strength };
    });

  return {
    nodes,
    edges,
    minYear: allYears[0] ?? 0,
    maxYear: allYears[allYears.length - 1] ?? 0,
  };
}

export async function getConceptBump(): Promise<ConceptBumpData> {
  const rows = await prisma.bookKeyword.findMany({
    where: {
      keyword: { not: API_ERROR_SENTINEL },
      book: { readAt: { not: null } },
    },
    select: {
      keyword: true,
      count: true,
      book: { select: { readAt: true } },
    },
  });

  const yearConceptCount: Record<number, Record<string, number>> = {};
  const totalCounts: Record<string, number> = {};

  for (const row of rows) {
    const year = row.book.readAt!.getFullYear();
    if (!yearConceptCount[year]) yearConceptCount[year] = {};
    yearConceptCount[year][row.keyword] =
      (yearConceptCount[year][row.keyword] ?? 0) + row.count;
    totalCounts[row.keyword] = (totalCounts[row.keyword] ?? 0) + row.count;
  }

  const topConcepts = Object.entries(totalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CONCEPTS)
    .map(([c]) => c);

  const years = Object.keys(yearConceptCount)
    .map(Number)
    .sort((a, b) => a - b);

  const data: ConceptRankYear[] = years.map((year) => {
    const conceptMap = yearConceptCount[year];
    const ranked = topConcepts
      .filter((c) => (conceptMap[c] ?? 0) > 0)
      .sort((a, b) => (conceptMap[b] ?? 0) - (conceptMap[a] ?? 0));

    const ranks: Record<string, number> = {};
    ranked.forEach((c, i) => {
      ranks[c] = i + 1;
    });

    return { year, ranks };
  });

  return { years, concepts: topConcepts, data };
}
