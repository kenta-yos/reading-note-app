import { NextResponse } from "next/server";

const NDL_API = "https://ndlsearch.ndl.go.jp/api/opensearch";

function extractYear(issued: string): number | null {
  const match = issued.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

/** "姓, 名" や "姓,名" → "姓名" に正規化（日本語著者のみスペースなし、英語著者はスペースあり） */
function normalizeAuthor(raw: string): string {
  const parts = raw.split(/,\s*/).map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return raw.trim();
  // 先頭部分が日本語文字を含む場合は姓名をスペースなしで結合、英語名はスペースで結合
  const hasJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/.test(parts[0]);
  return hasJapanese ? parts.join("") : parts.join(" ");
}

/** dc:creator タグを全件取得して著者名を「、」で連結 */
function getAllCreators(itemXml: string): string {
  const matches = [...itemXml.matchAll(/<dc:creator[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/gi)];
  const authors = matches
    .map(m => normalizeAuthor(m[1].trim()))
    .filter(Boolean);

  // 重複除去（NDLは同一著者が複数形式で入ることがある）
  const unique = [...new Set(authors)];
  return unique.join("、");
}

function getDcTag(itemXml: string, tag: string): string {
  const m = itemXml.match(new RegExp(`<dc:${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/dc:${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function getDcTermsTag(itemXml: string, tag: string): string {
  const m = itemXml.match(new RegExp(`<dcterms:${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/dcterms:${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");

  if (!title) {
    return NextResponse.json({ error: "title パラメータが必要です" }, { status: 400 });
  }

  // 国立国会図書館 OpenSearch API（無料・APIキー不要）
  const url = new URL(NDL_API);
  url.searchParams.set("title", title);
  url.searchParams.set("cnt", "50"); // 多めに取得してフィルタ後5件確保

  const res = await fetch(url.toString());

  if (!res.ok) {
    return NextResponse.json({ error: "書籍情報の取得に失敗しました" }, { status: 502 });
  }

  const xml = await res.text();
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  // 入力キーワードを正規化（全角→半角、小文字化）
  const normalize = (s: string) =>
    s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const keyword = normalize(title);

  type Candidate = {
    title: string;
    author: string;
    publisherName: string;
    publishedYear: number | null;
  };

  const candidates: Candidate[] = [];

  for (const itemXml of itemMatches) {
    // 図書のみ対象（記事・雑誌・博士論文などを除外）
    const categories = [...itemXml.matchAll(/<category>([^<]+)<\/category>/g)].map(m => m[1]);
    if (!categories.includes("図書")) continue;

    const itemTitle = getDcTag(itemXml, "title");
    if (!itemTitle) continue;

    // タイトルが入力キーワードを含むものだけに絞る
    if (!normalize(itemTitle).includes(keyword)) continue;

    const author = getAllCreators(itemXml);
    const publisher = getDcTag(itemXml, "publisher");
    const issued = getDcTermsTag(itemXml, "issued");

    candidates.push({
      title: itemTitle,
      author,
      publisherName: publisher,
      publishedYear: extractYear(issued),
    });

    if (candidates.length >= 5) break;
  }

  return NextResponse.json({ candidates });
}
