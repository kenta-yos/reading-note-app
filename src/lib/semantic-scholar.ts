/**
 * Semantic Scholar API クライアント
 * https://api.semanticscholar.org/
 * レート制限: 1 req/sec（APIキーなし）
 */

export type ScholarPaper = {
  paperId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string;
  citationCount: number | null;
};

const BASE_URL = "https://api.semanticscholar.org/graph/v1";
const FIELDS = "paperId,title,authors,year,abstract,url,citationCount";

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    return res;
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw new Error(`Semantic Scholar API timeout: ${url}`);
  }
}

export async function searchPapers(
  query: string,
  maxResults = 10
): Promise<ScholarPaper[]> {
  const url = new URL(`${BASE_URL}/paper/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(maxResults));
  url.searchParams.set("fields", FIELDS);

  const res = await fetchWithRetry(url.toString());
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.data || !Array.isArray(data.data)) return [];

  return data.data.map(
    (p: {
      paperId: string;
      title: string;
      authors?: { name: string }[];
      year?: number;
      abstract?: string;
      url?: string;
      citationCount?: number;
    }) => ({
      paperId: p.paperId,
      title: p.title,
      authors: (p.authors ?? []).map((a) => a.name),
      year: p.year ?? null,
      abstract: p.abstract ?? null,
      url: p.url ?? `https://www.semanticscholar.org/paper/${p.paperId}`,
      citationCount: p.citationCount ?? null,
    })
  );
}

/**
 * 複数クエリを1秒間隔で順次実行
 */
export async function searchPapersMultiple(
  queries: { query: string; intent: string }[],
  maxPerQuery = 10
): Promise<(ScholarPaper & { searchIntent: string })[]> {
  const all: (ScholarPaper & { searchIntent: string })[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100));
    const papers = await searchPapers(queries[i].query, maxPerQuery);
    for (const p of papers) {
      if (seenIds.has(p.paperId)) continue;
      seenIds.add(p.paperId);
      all.push({ ...p, searchIntent: queries[i].intent });
    }
  }

  return all;
}
