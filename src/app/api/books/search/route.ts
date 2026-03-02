import { NextResponse } from "next/server";

type Candidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
  pages: number | null;
  description: string | null;
  thumbnail: string | null;
  isbn: string | null;
};

type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    language?: string;
  };
};

function extractYear(date: string | undefined): number | null {
  if (!date) return null;
  const match = date.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function extractIsbn(identifiers: { type: string; identifier: string }[] | undefined): string | null {
  if (!identifiers) return null;
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  return isbn13?.identifier ?? isbn10?.identifier ?? null;
}

// ── NDL (国立国会図書館) OpenSearch でフォールバック検索 ──
async function searchNDL(query: string, isbn?: string): Promise<Candidate[]> {
  const url = new URL("https://ndlsearch.ndl.go.jp/api/opensearch");
  if (isbn) {
    url.searchParams.set("isbn", isbn);
  } else {
    url.searchParams.set("title", query);
  }
  url.searchParams.set("cnt", "8");
  url.searchParams.set("mediatype", "1"); // 図書のみ

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const xml = await res.text();

  const candidates: Candidate[] = [];
  // XMLパース（軽量な正規表現ベース）
  const items = xml.split("<item>").slice(1);

  for (const item of items) {
    if (candidates.length >= 8) break;

    const get = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].replace(/<!\[CDATA\[|]]>/g, "").trim() : null;
    };

    const title = get("title");
    if (!title) continue;

    // カテゴリが「図書」のもののみ
    const categories = [...item.matchAll(/<category>([^<]*)<\/category>/g)].map(m => m[1]);
    if (categories.length > 0 && !categories.includes("図書")) continue;

    const author = get("dc:creator");
    const publisher = get("dc:publisher");
    const extent = get("dc:extent");

    // ページ数を extent から抽出 (例: "386p", "224p ; 15cm")
    let pages: number | null = null;
    if (extent) {
      const pm = extent.match(/(\d+)\s*p/);
      if (pm) pages = parseInt(pm[1]);
    }

    // 出版年
    let year: number | null = null;
    const dateStr = get("dc:date") || get("dcterms:issued");
    if (dateStr) {
      const ym = dateStr.match(/(\d{4})/);
      if (ym) year = parseInt(ym[1]);
    }

    // ISBN を抽出
    let itemIsbn: string | null = isbn ?? null;
    const isbnMatches = [...item.matchAll(/<dc:identifier[^>]*>([^<]*)<\/dc:identifier>/g)];
    for (const m of isbnMatches) {
      const val = m[1].replace(/-/g, "");
      if (/^97[89]\d{10}$/.test(val)) { itemIsbn = val; break; }
      if (/^\d{10}$/.test(val) && !itemIsbn) { itemIsbn = val; }
    }

    candidates.push({
      title: title.replace(/<[^>]*>/g, ""),
      author: author ?? "",
      publisherName: publisher ?? "",
      publishedYear: year,
      pages,
      description: null,
      thumbnail: null,
      isbn: itemIsbn,
    });
  }

  return candidates;
}

// ── OpenBD で候補を補完 ──
async function enrichWithOpenBD(candidates: Candidate[], candidateIsbns: (string | null)[]) {
  const validIsbns = candidateIsbns.filter((isbn): isbn is string => isbn !== null);
  if (validIsbns.length === 0) return;

  try {
    const openBDRes = await fetch(
      `https://api.openbd.jp/v1/get?isbn=${validIsbns.join(",")}`
    );
    if (!openBDRes.ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openBDData: Array<any | null> = await openBDRes.json();

    const pagesMap: Record<string, number> = {};
    const descMap: Record<string, string> = {};
    const publisherMap: Record<string, string> = {};
    const thumbnailMap: Record<string, string> = {};

    for (const entry of openBDData) {
      if (!entry) continue;
      const isbn = entry.summary?.isbn;
      if (!isbn) continue;

      if (entry.summary?.pages) {
        const p = parseInt(entry.summary.pages, 10);
        if (!isNaN(p) && p > 0) pagesMap[isbn] = p;
      }

      if (entry.summary?.publisher) {
        publisherMap[isbn] = entry.summary.publisher;
      }

      if (entry.summary?.cover) {
        thumbnailMap[isbn] = entry.summary.cover.replace(/^http:/, "https:");
      }

      // ページ数を onix からも取得（extent）
      const extents: Array<{ ExtentType?: string; ExtentValue?: string }> =
        entry.onix?.DescriptiveDetail?.Extent ?? [];
      const pageExtent = extents.find((e: { ExtentType?: string }) => e.ExtentType === "11");
      if (pageExtent?.ExtentValue) {
        const p = parseInt(pageExtent.ExtentValue, 10);
        if (!isNaN(p) && p > 0 && !pagesMap[isbn]) pagesMap[isbn] = p;
      }

      const textContents: Array<{ TextType?: string; Text?: string }> =
        entry.onix?.CollateralDetail?.TextContent ?? [];
      const detailed = textContents.find((tc: { TextType?: string }) => tc.TextType === "03");
      const short = textContents.find((tc: { TextType?: string }) => tc.TextType === "02");
      const desc = detailed?.Text || short?.Text;
      if (desc) descMap[isbn] = desc;
    }

    for (let i = 0; i < candidates.length; i++) {
      const isbn = candidateIsbns[i];
      if (!isbn) continue;
      if (candidates[i].pages === null && pagesMap[isbn]) {
        candidates[i].pages = pagesMap[isbn];
      }
      if (!candidates[i].publisherName && publisherMap[isbn]) {
        candidates[i].publisherName = publisherMap[isbn];
      }
      if (!candidates[i].thumbnail && thumbnailMap[isbn]) {
        candidates[i].thumbnail = thumbnailMap[isbn];
      }
      if (descMap[isbn]) {
        candidates[i].description = descMap[isbn];
      }
    }
  } catch {
    // OpenBD 失敗時はそのまま返す
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "q パラメータが必要です（2文字以上）" }, { status: 400 });
  }

  // ISBN検索の場合、Google Booksで見つからなければOpenBDでタイトルを取得して再検索
  let searchQuery = q;
  const isbnMatch = q.match(/^isbn[:\s]*(\d{10,13})$/i);

  if (isbnMatch) {
    const isbn = isbnMatch[1];
    // まずGoogle BooksでISBN検索
    const isbnUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    isbnUrl.searchParams.set("q", `isbn:${isbn}`);
    isbnUrl.searchParams.set("maxResults", "5");
    isbnUrl.searchParams.set("printType", "books");
    if (process.env.GOOGLE_BOOKS_API_KEY) {
      isbnUrl.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
    }
    const isbnRes = await fetch(isbnUrl.toString());
    const isbnData = isbnRes.ok ? await isbnRes.json() : { items: [] };

    if (!isbnData.items || isbnData.items.length === 0) {
      // Google Booksに無い場合、OpenBDからタイトルを取得してタイトル検索にフォールバック
      try {
        const obdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
        if (obdRes.ok) {
          const obdData = await obdRes.json();
          const title = obdData?.[0]?.summary?.title;
          if (title) {
            searchQuery = title;
          }
        }
      } catch {
        // OpenBDも失敗した場合はISBNのまま検索
      }
    }
  }

  // Google Books API（日本語書籍を優先取得するため多めに取得してフィルタ）
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  let candidates: Candidate[] = [];
  let candidateIsbns: (string | null)[] = [];

  const res = await fetch(url.toString());

  if (res.ok) {
    // ── Google Books 成功パス ──
    const data = await res.json();
    const items: GoogleBooksVolume[] = data.items ?? [];

    // 日本語書籍を判定するヘルパー
    const isJapanese = (vol: GoogleBooksVolume["volumeInfo"]) => {
      if (!vol) return false;
      if (vol.language === "ja") return true;
      const text = `${vol.title ?? ""}${vol.authors?.join("") ?? ""}${vol.publisher ?? ""}`;
      return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
    };

    // 日本語書籍を優先、同程度なら出版年が新しい順にソート
    const sorted = [...items].sort((a, b) => {
      const aJa = isJapanese(a.volumeInfo) ? 0 : 1;
      const bJa = isJapanese(b.volumeInfo) ? 0 : 1;
      if (aJa !== bJa) return aJa - bJa;
      const aYear = extractYear(a.volumeInfo?.publishedDate) ?? 0;
      const bYear = extractYear(b.volumeInfo?.publishedDate) ?? 0;
      return bYear - aYear;
    });

    // ISBN で重複排除しつつ候補を抽出（最大8件）
    const seenIsbns = new Set<string>();

    for (const item of sorted) {
      if (candidates.length >= 8) break;
      const vol = item.volumeInfo;
      if (!vol?.title) continue;

      const isbn = extractIsbn(vol.industryIdentifiers);
      if (isbn) {
        if (seenIsbns.has(isbn)) continue;
        seenIsbns.add(isbn);
      }

      const thumbnail = vol.imageLinks?.thumbnail ?? vol.imageLinks?.smallThumbnail ?? null;

      candidates.push({
        title: vol.title,
        author: vol.authors?.join("／") ?? "",
        publisherName: vol.publisher ?? "",
        publishedYear: extractYear(vol.publishedDate),
        pages: vol.pageCount && vol.pageCount > 0 ? vol.pageCount : null,
        description: vol.description ?? null,
        thumbnail: thumbnail ? thumbnail.replace(/^http:/, "https:") : null,
        isbn,
      });
      candidateIsbns.push(isbn);
    }
  } else {
    // ── Google Books 失敗 → NDL フォールバック ──
    console.warn(`Google Books API failed (${res.status}), falling back to NDL`);
    const isbn = isbnMatch?.[1];
    candidates = await searchNDL(searchQuery, isbn);
    candidateIsbns = candidates.map((c) => c.isbn);
  }

  if (candidates.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  // OpenBD 補完: ISBN がある候補について日本語の内容紹介・ページ数・表紙を補完
  await enrichWithOpenBD(candidates, candidateIsbns);

  return NextResponse.json({ candidates });
}
