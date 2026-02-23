/**
 * 国立国会図書館 SRU API クライアント
 * endpoint: https://ndlsearch.ndl.go.jp/api/sru
 *
 * - 対象出版社の直近2ヶ月 / 今後2ヶ月の書籍を取得
 * - dcndl:callNumber から NDCコードを取り出し学問分野を推定（LLMなし）
 */

export type NDLBook = {
  title: string;
  author: string;
  publisher: string;
  issued: string; // "YYYY-MM" or "YYYY"
  isbn: string | null;
  ndcCode: string | null;
  discipline: string | null;
  ndlUrl: string | null; // 国立国会図書館の書誌ページURL
  price: number | null;  // 税込定価（円）OpenBD より
};

// ── NDC → 学問分野マッピング ────────────────────────────────
// 最長マッチ優先（3桁 > 2桁 > 1桁）
const NDC_MAP: [string, string][] = [
  ["140", "心理学"],
  ["141", "心理学"],
  ["143", "心理学"],
  ["146", "心理学"],
  ["160", "宗教学"],
  ["170", "宗教学"],
  ["310", "政治学"],
  ["311", "政治学"],
  ["312", "政治学"],
  ["313", "政治学"],
  ["314", "政治学"],
  ["315", "政治学"],
  ["316", "社会学"],
  ["317", "行政学"],
  ["318", "行政学"],
  ["319", "国際関係論"],
  ["320", "法学"],
  ["321", "法学"],
  ["322", "法学"],
  ["323", "法学"],
  ["324", "法学"],
  ["325", "法学"],
  ["326", "法学"],
  ["327", "法学"],
  ["328", "法学"],
  ["329", "法学"],
  ["330", "経済学"],
  ["331", "経済学"],
  ["332", "経済学"],
  ["333", "経済学"],
  ["334", "経済学"],
  ["335", "経営学"],
  ["336", "経営学"],
  ["337", "経済学"],
  ["338", "経済学"],
  ["360", "社会学"],
  ["361", "社会学"],
  ["362", "社会学"],
  ["363", "社会学"],
  ["364", "社会学"],
  ["365", "社会学"],
  ["366", "社会学"],
  ["367", "社会学"],
  ["368", "社会学"],
  ["369", "社会学"],
  ["370", "教育学"],
  ["371", "教育学"],
  ["372", "教育学"],
  ["373", "教育学"],
  ["374", "教育学"],
  ["375", "教育学"],
  ["376", "教育学"],
  ["377", "教育学"],
  ["378", "教育学"],
  ["379", "教育学"],
  ["380", "民俗学・文化人類学"],
  ["381", "民俗学・文化人類学"],
  ["382", "民俗学・文化人類学"],
  ["389", "文化人類学"],
  ["490", "医学・薬学"],
  ["490", "医学"],
  ["10", "哲学・倫理学"],
  ["11", "哲学・倫理学"],
  ["12", "哲学・倫理学"],
  ["13", "哲学・倫理学"],
  ["15", "哲学・倫理学"],
  ["18", "哲学・倫理学"],
  ["19", "哲学・倫理学"],
  ["21", "歴史学"],
  ["22", "歴史学"],
  ["23", "歴史学"],
  ["24", "歴史学"],
  ["25", "歴史学"],
  ["26", "歴史学"],
  ["27", "歴史学"],
  ["28", "歴史学"],
  ["29", "地理学"],
  ["40", "自然科学"],
  ["41", "数学"],
  ["42", "物理学"],
  ["43", "化学"],
  ["44", "天文学"],
  ["45", "地球科学"],
  ["46", "生物学"],
  ["47", "生物学"],
  ["48", "生物学"],
  ["49", "医学・薬学"],
  ["50", "工学・技術"],
  ["51", "工学・技術"],
  ["52", "工学・技術"],
  ["60", "産業・農業"],
  ["70", "芸術"],
  ["80", "言語学"],
  ["81", "言語学"],
  ["90", "文学"],
];

export function ndcToDiscipline(ndc: string | null): string | null {
  if (!ndc) return null;
  // 先頭の数字部分のみ抽出（"366.14 ﾊﾗ" → "366"）
  const m = ndc.match(/^(\d+)/);
  if (!m) return null;
  const digits = m[1];

  // 3桁 → 2桁 → 1桁の順で最長マッチ
  for (const [prefix, discipline] of NDC_MAP) {
    if (digits.startsWith(prefix)) return discipline;
  }
  return null;
}

// ── HTML エスケープ解除（外部ライブラリ不要）─────────────────
function unescapeHtml(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

// ── XMLタグ抽出ヘルパー ───────────────────────────────────────
function extractTag(xml: string, nsPrefix: string, localName: string): string {
  const re = new RegExp(
    `<${nsPrefix}:${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nsPrefix}:${localName}>`,
    "i"
  );
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function extractAllTags(xml: string, nsPrefix: string, localName: string): string[] {
  const re = new RegExp(
    `<${nsPrefix}:${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nsPrefix}:${localName}>`,
    "gi"
  );
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) results.push(text);
  }
  return results;
}

function extractAttrTag(xml: string, tag: string, attr: string, attrValue: string): string {
  const re = new RegExp(
    `<${tag}[^>]*${attr}="[^"]*${attrValue}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

// ── recordData 1件をパース ────────────────────────────────────
function parseRecord(rawRecordData: string, fallbackPublisher: string): NDLBook | null {
  const chunk = unescapeHtml(rawRecordData);

  // 雑誌・逐次刊行物を除外
  // 判定基準: ISBNがある = 書籍。雑誌各号はNDLで type:book と分類されるがISBNを持たない
  const descriptions = extractAllTags(chunk, "dcterms", "description");
  const typeDesc = descriptions.find((d) => d.startsWith("type :"));
  if (typeDesc === "type : title") return null; // 雑誌タイトルレコード自体

  const title = extractTag(chunk, "dcterms", "title") || extractTag(chunk, "dc", "title");
  if (!title) return null;

  // 著者: <dc:creator> は "著者名 著" のプレーンテキスト
  const dcCreators = extractAllTags(chunk, "dc", "creator");
  const author = dcCreators.join("／");

  // 出版社: <dcterms:publisher><foaf:Agent><foaf:name>
  const publisherBlock = extractTag(chunk, "dcterms", "publisher");
  const publisher = publisherBlock
    ? extractTag(publisherBlock, "foaf", "name") || fallbackPublisher
    : fallbackPublisher;

  // 発行日: <dcterms:date> → "2025.12" or "2026.02"
  const dateRaw = extractTag(chunk, "dcterms", "date") || extractTag(chunk, "dcterms", "issued");
  // "2025.12" → "2025-12" に正規化
  const issued = dateRaw.replace(/\./g, "-").replace(/^(\d{4})-?$/, "$1");

  // ISBN: rdf:datatype に "ISBN" を含む dcterms:identifier
  const isbn = extractAttrTag(chunk, "dcterms:identifier", "rdf:datatype", "ISBN");

  // ISBNなし = 雑誌・逐次刊行物の号として除外（書籍には必ずISBNがある）
  if (!isbn) return null;

  // NDC: <dcndl:callNumber>
  const callNumber = extractTag(chunk, "dcndl", "callNumber");
  const ndcRaw = callNumber.match(/^(\d[\d.]*)/)?.[1] ?? null;

  // NDL書誌ページURL: BibAdminResource の rdf:about（#なし）
  const aboutMatch = chunk.match(
    /dcndl:BibAdminResource[^>]*rdf:about="(https:\/\/ndlsearch\.ndl\.go\.jp\/books\/[^"#]+)"/
  );
  const ndlUrl = aboutMatch?.[1] ?? null;

  return {
    title,
    author,
    publisher,
    issued,
    isbn: isbn || null,
    ndcCode: ndcRaw,
    discipline: ndcToDiscipline(ndcRaw),
    ndlUrl,
    price: null, // OpenBD で後から補完
  };
}

// ── SRU API 呼び出し ──────────────────────────────────────────
const NDL_SRU = "https://ndlsearch.ndl.go.jp/api/sru";

// 出版社ごとの取得上限（学術出版社は月数十冊程度なので 100 で実質全件）
const MAX_RECORDS_PER_PUBLISHER = 100;

async function fetchNDL(
  publisher: string,
  fromYM: string,
  untilYM: string,
  revalidateSec: number
): Promise<NDLBook[]> {
  const query = `publisher="${publisher}" AND from=${fromYM} AND until=${untilYM}`;
  const url = new URL(NDL_SRU);
  url.searchParams.set("operation", "searchRetrieve");
  url.searchParams.set("recordSchema", "dcndl");
  url.searchParams.set("maximumRecords", String(MAX_RECORDS_PER_PUBLISHER));
  url.searchParams.set("mediatype", "1"); // 図書のみ（雑誌除外）
  url.searchParams.set("sortKeys", "issued,,0"); // 新しい順
  url.searchParams.set("query", query);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: revalidateSec },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // <recordData>...</recordData> を分割して各レコードをパース
    const recordDataRe = /<recordData>([\s\S]*?)<\/recordData>/gi;
    const books: NDLBook[] = [];
    let m: RegExpExecArray | null;
    while ((m = recordDataRe.exec(xml)) !== null) {
      const book = parseRecord(m[1], publisher);
      if (book) books.push(book);
    }
    return books;
  } catch {
    return [];
  }
}

// ── 年月ユーティリティ ────────────────────────────────────────
function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// ISBN または タイトルで重複排除
function deduplicateBooks(books: NDLBook[]): NDLBook[] {
  const seen = new Set<string>();
  return books.filter((b) => {
    const key = b.isbn ?? b.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 直近1ヶ月分（先月〜今月）の書籍を取得
 * ページ側で OpenBD 日付を使って "今日以前" にフィルタする
 */
export async function fetchRecentBooks(publishers: string[]): Promise<NDLBook[]> {
  const now = new Date();
  const fromYM = ym(addMonths(now, -1)); // 先月
  const untilYM = ym(now);               // 今月

  const results = await Promise.allSettled(
    publishers.map((p) => fetchNDL(p, fromYM, untilYM, 3600))
  );
  const books = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return deduplicateBooks(books);
}

/**
 * 今後1ヶ月分（今月〜来月）の書籍を取得
 * ページ側で OpenBD 日付を使って "今日より後" にフィルタする
 */
export async function fetchUpcomingBooks(publishers: string[]): Promise<NDLBook[]> {
  const now = new Date();
  const fromYM = ym(now);               // 今月（今日以降のものを含む）
  const untilYM = ym(addMonths(now, 1)); // 来月

  const results = await Promise.allSettled(
    publishers.map((p) => fetchNDL(p, fromYM, untilYM, 3600))
  );
  const books = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return deduplicateBooks(books);
}

// ── OpenBD 価格・日付取得 ──────────────────────────────────────
type OpenBDEntry = {
  summary?: {
    pubdate?: string; // "YYYYMMDD"
  };
  hanmoto?: {
    dateshuppan?: string; // "YYYY-MM-DD"（版元ドットコム提供、最も精度が高い）
  };
  onix?: {
    ProductSupply?: {
      SupplyDetail?: {
        Price?: { PriceAmount?: string }[];
      };
    };
  };
} | null;

/**
 * ISBNリストを使って OpenBD から税込定価・出版日を取得し books を補完して返す
 * - price: 税込定価（円）
 * - issued: OpenBD に正確な日付があれば "YYYY-MM-DD" に更新（NDL は月まで）
 */
export async function enrichWithPrices(books: NDLBook[]): Promise<NDLBook[]> {
  const targets: { cleanIsbn: string; idx: number }[] = [];
  books.forEach((b, idx) => {
    if (b.isbn) targets.push({ cleanIsbn: b.isbn.replace(/-/g, ""), idx });
  });
  if (targets.length === 0) return books;

  try {
    const res = await fetch(
      `https://api.openbd.jp/v1/get?isbn=${targets.map((t) => t.cleanIsbn).join(",")}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return books;
    const data: OpenBDEntry[] = await res.json();

    const enriched = [...books];
    for (let i = 0; i < targets.length; i++) {
      const entry = data[i];
      if (!entry) continue;

      const priceStr =
        entry.onix?.ProductSupply?.SupplyDetail?.Price?.[0]?.PriceAmount;
      // 日付の精度: hanmoto.dateshuppan > summary.pubdate > NDL 月単位
      const hanmotoDate = entry.hanmoto?.dateshuppan; // "YYYY-MM-DD"
      const pubdate = entry.summary?.pubdate;          // "YYYYMMDD"

      const updates: Partial<NDLBook> = {};
      if (priceStr) updates.price = parseInt(priceStr, 10);
      if (hanmotoDate && /^\d{4}-\d{2}-\d{2}$/.test(hanmotoDate)) {
        updates.issued = hanmotoDate;
      } else if (pubdate && pubdate.length === 8) {
        // "20260225" → "2026-02-25"
        updates.issued = `${pubdate.slice(0, 4)}-${pubdate.slice(4, 6)}-${pubdate.slice(6, 8)}`;
      }

      if (Object.keys(updates).length > 0) {
        enriched[targets[i].idx] = { ...enriched[targets[i].idx], ...updates };
      }
    }
    return enriched;
  } catch {
    return books;
  }
}
