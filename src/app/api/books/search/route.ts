import { NextResponse } from "next/server";

const NDL_SRU = "https://ndlsearch.ndl.go.jp/api/sru";

function extractYear(issued: string): number | null {
  const match = issued.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

/** XML タグの内容を取得（内部タグを除去） */
function getXmlText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

/** XML タグの内容を全件取得 */
function getAllXmlText(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) results.push(text);
  }
  return results;
}

/** "350p" "vi, 350p" "350ページ" などからページ数を抽出 */
function parsePages(extent: string): number | null {
  const m = extent.match(/(\d+)\s*[pPページ]/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return !isNaN(n) && n > 0 ? n : null;
}

type Candidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
  pages: number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");

  if (!title) {
    return NextResponse.json({ error: "title パラメータが必要です" }, { status: 400 });
  }

  // 国立国会図書館 SRU API（図書のみ、新しい順）
  const url = new URL(NDL_SRU);
  url.searchParams.set("operation", "searchRetrieve");
  url.searchParams.set("recordSchema", "dcndl");
  url.searchParams.set("maximumRecords", "30");
  url.searchParams.set("mediatype", "1");
  url.searchParams.set("sortKeys", "issued,,0");
  url.searchParams.set("query", `title="${title}"`);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "書籍情報の取得に失敗しました" }, { status: 502 });
  }

  const xml = await res.text();

  const normalize = (s: string) =>
    s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const keyword = normalize(title);

  const candidates: Candidate[] = [];
  const candidateIsbns: (string | null)[] = [];

  const recordDataRe = /<recordData>([\s\S]*?)<\/recordData>/gi;
  let m: RegExpExecArray | null;

  while ((m = recordDataRe.exec(xml)) !== null && candidates.length < 5) {
    const chunk = m[1];

    // 雑誌タイトルレコードを除外
    const descriptions = getAllXmlText(chunk, "dcterms:description");
    if (descriptions.some((d) => d === "type : title")) continue;

    const itemTitle =
      getXmlText(chunk, "dcterms:title") || getXmlText(chunk, "dc:title");
    if (!itemTitle || !normalize(itemTitle).includes(keyword)) continue;

    // ISBN 必須（ISBNなし = 雑誌・逐次刊行物など）
    const isbnMatch = chunk.match(
      /<dcterms:identifier[^>]*rdf:datatype="[^"]*ISBN[^"]*"[^>]*>([^<]+)<\/dcterms:identifier>/i
    );
    const isbn = isbnMatch ? isbnMatch[1].trim().replace(/[^0-9]/g, "") : null;
    if (!isbn) continue;

    const creators = getAllXmlText(chunk, "dc:creator");
    const author = creators.join("／");

    const publisher =
      getXmlText(chunk, "dcterms:publisher") || getXmlText(chunk, "dc:publisher");

    const dateRaw =
      getXmlText(chunk, "dcterms:date") || getXmlText(chunk, "dcterms:issued");
    const issued = dateRaw.replace(/\./g, "-");

    const extent =
      getXmlText(chunk, "dcterms:extent") || getXmlText(chunk, "dc:extent");
    const pages = parsePages(extent);

    candidates.push({
      title: itemTitle,
      author,
      publisherName: publisher,
      publishedYear: extractYear(issued),
      pages,
    });
    candidateIsbns.push(isbn);
  }

  if (candidates.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  // ページ数が取れなかった候補を OpenBD で補完
  const missingIsbns = candidateIsbns.filter(
    (isbn, i) => isbn !== null && candidates[i].pages === null
  ) as string[];

  if (missingIsbns.length > 0) {
    try {
      const openBDRes = await fetch(
        `https://api.openbd.jp/v1/get?isbn=${missingIsbns.join(",")}`
      );
      if (openBDRes.ok) {
        const openBDData: Array<{
          summary?: { isbn?: string; pages?: string };
        } | null> = await openBDRes.json();

        const pagesMap: Record<string, number> = {};
        for (const entry of openBDData) {
          if (entry?.summary?.isbn && entry.summary.pages) {
            const p = parseInt(entry.summary.pages, 10);
            if (!isNaN(p) && p > 0) pagesMap[entry.summary.isbn] = p;
          }
        }

        for (let i = 0; i < candidates.length; i++) {
          const isbn = candidateIsbns[i];
          if (isbn && candidates[i].pages === null && pagesMap[isbn]) {
            candidates[i].pages = pagesMap[isbn];
          }
        }
      }
    } catch {
      // OpenBD 失敗時はページ数なしのまま返す
    }
  }

  return NextResponse.json({ candidates });
}
