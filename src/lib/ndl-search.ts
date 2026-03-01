/**
 * NDL キーワード検索クライアント
 * my-reading-assistant の ndl.ts を移植・簡略化
 * 用途: 読書ラボのおすすめ機能でキーワード検索する
 */

export type NdlBookResult = {
  title: string;
  authors: string[];
  publisher: string;
  year: string;
  isbn: string;
};

function htmlDecode(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAll(xml: string, fullTag: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(
    `<${fullTag}(?:\\s[^>]*)?>([^<]+)</${fullTag}>`,
    "g"
  );
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const val = m[1].trim();
    if (val) results.push(val);
  }
  return results;
}

function extractFirst(xml: string, fullTag: string): string {
  return extractAll(xml, fullTag)[0] ?? "";
}

const LIBRARY_SUFFIXES = [
  "図書館",
  "図書室",
  "図書センター",
  "資料館",
  "ライブラリー",
];

function extractPublisher(foafNames: string[]): string {
  for (const name of foafNames) {
    if (name.includes(",")) continue;
    if (LIBRARY_SUFFIXES.some((s) => name.endsWith(s))) continue;
    if (name === "国立国会図書館") continue;
    return name.trim();
  }
  return "";
}

function cleanAuthorName(raw: string): string {
  return raw
    .replace(/\s*[,，]\s*.*$/, "")
    .replace(
      /\s+(?:著|訳|編|監修|著者|文|絵|写真|選|校|注|解説|原著).*/u,
      ""
    )
    .replace(/\[.*?\]/g, "")
    .trim();
}

function parseRecords(sruXml: string): NdlBookResult[] {
  const books: NdlBookResult[] = [];
  const recordRegex = /<recordData>([\s\S]*?)<\/recordData>/g;
  let match;

  while ((match = recordRegex.exec(sruXml)) !== null) {
    const inner = htmlDecode(match[1]);

    // mediatype=1 で図書に絞っているため type チェックは不要
    const title = extractFirst(inner, "dcterms:title");
    if (!title) continue;

    // 紀要・論文集・講座ものを除外
    if (/紀要|研究報告|論文集|講座|年報|彙報/.test(title)) continue;

    const isbnMatch = inner.match(
      /<dcterms:identifier[^>]*ISBN[^>]*>([^<]+)</
    );
    const isbn = isbnMatch?.[1]?.trim() ?? "";
    if (!isbn) continue;

    const authors = extractAll(inner, "dc:creator")
      .map(cleanAuthorName)
      .filter(Boolean);

    const foafNames = extractAll(inner, "foaf:name");
    const publisher = extractPublisher(foafNames);

    const year = extractFirst(inner, "dcterms:issued").replace(/-.*$/, "");

    books.push({ title, authors, publisher, year, isbn });
  }

  return books;
}

export type NdlSearchQuery = { keywords: string[]; intent: string };

export type NdlCandidate = NdlBookResult & {
  searchIntent: string;
};

export async function searchNdlByKeywords(
  queries: NdlSearchQuery[]
): Promise<NdlCandidate[]> {
  if (!queries?.length) return [];

  const results = await Promise.allSettled(
    queries.map(async ({ keywords, intent }) => {
      const cql = keywords.map((k) => `anywhere="${k}"`).join(" AND ");
      const url =
        `https://ndlsearch.ndl.go.jp/api/sru` +
        `?operation=searchRetrieve` +
        `&query=${encodeURIComponent(cql)}` +
        `&maximumRecords=50` +
        `&mediatype=1` +
        `&recordSchema=dcndl`;

      let xml: string;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        xml = await res.text();
      } catch {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        xml = await res.text();
      }
      const books = parseRecords(xml);
      return books.map((book) => ({ ...book, searchIntent: intent }));
    })
  );

  const all: NdlCandidate[] = [];
  const seenIsbns = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const book of result.value) {
      if (book.isbn && seenIsbns.has(book.isbn)) continue;
      if (book.isbn) seenIsbns.add(book.isbn);
      all.push(book);
    }
  }

  // 版違いフィルタ
  const normalizeTitle = (t: string) =>
    t
      .replace(/[=＝:：].*/g, "")
      .replace(/\s+/g, "")
      .replace(/[第新改訂増補版]+版$/g, "");

  const editionMap = new Map<string, NdlCandidate>();
  for (const book of all) {
    const key = `${normalizeTitle(book.title)}__${book.publisher}`;
    const existing = editionMap.get(key);
    if (!existing || (book.year || "") > (existing.year || "")) {
      editionMap.set(key, book);
    }
  }

  return Array.from(editionMap.values());
}
