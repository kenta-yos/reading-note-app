import { NextResponse } from "next/server";

type Candidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
  pages: number | null;
  description: string | null;
  thumbnail: string | null;
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "q パラメータが必要です（2文字以上）" }, { status: 400 });
  }

  // Google Books API（APIキー不要）
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("langRestrict", "ja");
  url.searchParams.set("printType", "books");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "書籍情報の取得に失敗しました" }, { status: 502 });
  }

  const data = await res.json();
  const items: GoogleBooksVolume[] = data.items ?? [];

  // ISBN で重複排除しつつ候補を抽出（最大8件）
  const candidates: Candidate[] = [];
  const candidateIsbns: (string | null)[] = [];
  const seenIsbns = new Set<string>();

  for (const item of items) {
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
    });
    candidateIsbns.push(isbn);
  }

  if (candidates.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  // OpenBD 補完: ISBN がある候補について日本語の内容紹介・ページ数を補完
  const validIsbns = candidateIsbns.filter((isbn): isbn is string => isbn !== null);

  if (validIsbns.length > 0) {
    try {
      const openBDRes = await fetch(
        `https://api.openbd.jp/v1/get?isbn=${validIsbns.join(",")}`
      );
      if (openBDRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openBDData: Array<any | null> = await openBDRes.json();

        const pagesMap: Record<string, number> = {};
        const descMap: Record<string, string> = {};

        for (const entry of openBDData) {
          if (!entry) continue;
          const isbn = entry.summary?.isbn;
          if (!isbn) continue;

          if (entry.summary?.pages) {
            const p = parseInt(entry.summary.pages, 10);
            if (!isNaN(p) && p > 0) pagesMap[isbn] = p;
          }

          const textContents: Array<{ TextType?: string; Text?: string }> =
            entry.onix?.CollateralDetail?.TextContent ?? [];
          const detailed = textContents.find((tc) => tc.TextType === "03");
          const short = textContents.find((tc) => tc.TextType === "02");
          const desc = detailed?.Text || short?.Text;
          if (desc) descMap[isbn] = desc;
        }

        for (let i = 0; i < candidates.length; i++) {
          const isbn = candidateIsbns[i];
          if (!isbn) continue;
          if (candidates[i].pages === null && pagesMap[isbn]) {
            candidates[i].pages = pagesMap[isbn];
          }
          if (descMap[isbn]) {
            candidates[i].description = descMap[isbn];
          }
        }
      }
    } catch {
      // OpenBD 失敗時はそのまま返す
    }
  }

  return NextResponse.json({ candidates });
}
