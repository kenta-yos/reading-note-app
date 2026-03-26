/**
 * Consolidated /api/books/* routes
 * - GET/POST  /api/books           → list / create
 * - GET       /api/books/search    → search candidates
 * - POST      /api/books/next-read → AI next-read
 * - POST      /api/books/backfill-isbn → backfill ISBNs
 * - GET/PUT/PATCH/DELETE /api/books/[id] → single book CRUD
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BookStatus as PrismaBookStatus } from "@prisma/client";
import { searchNdlForCandidates, NdlFieldQuery } from "@/lib/ndl-search";

export const maxDuration = 30;

const RESERVED_SLUGS = new Set(["search", "backfill-isbn", "refetch"]);

type Params = { params: Promise<{ slug?: string[] }> };

// ── helpers ──
type Candidate = {
  title: string; author: string; publisherName: string;
  publishedYear: number | null; pages: number | null;
  description: string | null; thumbnail: string | null; isbn: string | null;
};
type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string; authors?: string[]; publisher?: string;
    publishedDate?: string; pageCount?: number; description?: string;
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
  return (identifiers.find((id) => id.type === "ISBN_13") ?? identifiers.find((id) => id.type === "ISBN_10"))?.identifier ?? null;
}
function isJapanese(vol: GoogleBooksVolume["volumeInfo"]): boolean {
  if (!vol) return false;
  if (vol.language === "ja") return true;
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(`${vol.title ?? ""}${vol.authors?.join("") ?? ""}${vol.publisher ?? ""}`);
}
function isCandidateJapanese(c: Candidate): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(`${c.title}${c.author}${c.publisherName}`);
}
function normalizeTitle(t: string): string {
  return t.replace(/[\s　・:：=＝\-－—–]/g, "").replace(/[（(].*?[)）]/g, "").replace(/[第新改訂増補版]+版$/g, "").toLowerCase();
}
function isbn10to13(isbn10: string): string {
  const base = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}
function normalizeIsbn(isbn: string): string {
  const digits = isbn.replace(/[- ]/g, "");
  if (digits.length === 10) return isbn10to13(digits);
  return digits;
}

// ── GET ──
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;

  if (!slug || slug.length === 0) return listBooks(req);
  if (slug[0] === "search") return searchBooks(req);
  if (!RESERVED_SLUGS.has(slug[0])) return getBook(slug[0]);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// ── POST ──
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;

  if (!slug || slug.length === 0) return createBook(req);
  if (slug[0] === "backfill-isbn") return backfillIsbn();
  if (slug[0] === "refetch") return refetchBookInfo(req);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// ── PUT ──
export async function PUT(req: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || slug.length === 0 || RESERVED_SLUGS.has(slug[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return updateBook(slug[0], req);
}

// ── PATCH ──
export async function PATCH(req: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || slug.length === 0 || RESERVED_SLUGS.has(slug[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return patchBook(slug[0], req);
}

// ── DELETE ──
export async function DELETE(_req: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || slug.length === 0 || RESERVED_SLUGS.has(slug[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return deleteBook(slug[0]);
}

// ────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────

async function listBooks(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  const where = {
    ...(year ? { readAt: { gte: new Date(parseInt(year), 0, 1), lt: new Date(parseInt(year) + 1, 0, 1) } } : {}),
    ...(category ? { category } : {}),
    ...(status && Object.values(PrismaBookStatus).includes(status as PrismaBookStatus) ? { status: status as PrismaBookStatus } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { author: { contains: q, mode: "insensitive" as const } }] } : {}),
  };

  const orderBy = status === "READ" || (!status && !q) ? { readAt: "desc" as const } : { createdAt: "desc" as const };
  const totalCount = await prisma.book.count({ where });
  const books = await prisma.book.findMany({ where, orderBy, take: limit + 1, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
  const hasMore = books.length > limit;
  const items = hasMore ? books.slice(0, limit) : books;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ books: items, nextCursor, totalCount });
}

async function createBook(req: Request) {
  try {
    const body = await req.json();
    const { title, author, publisher, publishedYear, isbn, pages, category, discipline, rating, description, notes, readAt, status } = body;
    const bookStatus = (status as PrismaBookStatus) || "READ";
    let resolvedReadAt: Date | null = null;
    if (bookStatus === "READ") resolvedReadAt = readAt ? new Date(readAt) : new Date();

    const book = await prisma.book.create({
      data: {
        title, author: author || null, publisher: publisher || null,
        publishedYear: publishedYear ? Number(publishedYear) : null,
        isbn: isbn || null, pages: pages ? Number(pages) : null,
        category: category || null, discipline: discipline || null,
        rating: rating ? Number(rating) : null, description: description || null,
        notes: notes || null, status: bookStatus, readAt: resolvedReadAt,
      },
    });
    revalidatePath("/", "layout");
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}

async function getBook(id: string) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(book);
}

async function updateBook(id: string, req: Request) {
  try {
    const body = await req.json();
    const { title, author, publisher, publishedYear, isbn, pages, category, discipline, rating, description, notes, readAt, status } = body;
    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newStatus = (status as PrismaBookStatus) ?? existingBook.status;
    let resolvedReadAt: Date | null = existingBook.readAt;
    if (newStatus === "READ" && existingBook.status !== "READ") resolvedReadAt = existingBook.readAt ?? new Date();
    else if (newStatus !== "READ" && existingBook.status === "READ") resolvedReadAt = null;
    else if (newStatus === "READ") resolvedReadAt = readAt ? new Date(readAt) : existingBook.readAt;
    const statusChanged = newStatus !== existingBook.status;

    const book = await prisma.book.update({
      where: { id },
      data: {
        title, author: author || null, publisher: publisher || null,
        publishedYear: publishedYear ? Number(publishedYear) : null,
        isbn: isbn || null, pages: pages ? Number(pages) : null,
        category: category || null, discipline: discipline || null,
        rating: rating ? Number(rating) : null, description: description || null,
        notes: notes || null, status: newStatus, readAt: resolvedReadAt,
        ...(statusChanged ? { statusChangedAt: new Date() } : {}),
      },
    });
    revalidatePath("/", "layout");
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

async function patchBook(id: string, req: Request) {
  try {
    const { status } = await req.json();
    const newStatus = status as PrismaBookStatus;
    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let resolvedReadAt: Date | null = existingBook.readAt;
    if (newStatus === "READ" && existingBook.status !== "READ") resolvedReadAt = existingBook.readAt ?? new Date();
    else if (newStatus !== "READ" && existingBook.status === "READ") resolvedReadAt = null;

    const book = await prisma.book.update({ where: { id }, data: { status: newStatus, readAt: resolvedReadAt, statusChangedAt: new Date() } });
    revalidatePath("/", "layout");
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

async function deleteBook(id: string) {
  try {
    await prisma.book.delete({ where: { id } });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}

async function refetchBookInfo(req: Request) {
  try {
    const { bookId } = await req.json();
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!book.isbn) return NextResponse.json({ error: "ISBNがありません" }, { status: 400 });

    // Google Books + OpenBD を並列取得
    const googleUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    googleUrl.searchParams.set("q", `isbn:${book.isbn}`);
    googleUrl.searchParams.set("maxResults", "1");
    if (process.env.GOOGLE_BOOKS_API_KEY) googleUrl.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

    const [googleRes, openBDRes] = await Promise.allSettled([
      fetch(googleUrl.toString()),
      fetch(`https://api.openbd.jp/v1/get?isbn=${book.isbn}`),
    ]);

    let description: string | null = null;
    let pages: number | null = null;

    // Google Books
    if (googleRes.status === "fulfilled" && googleRes.value.ok) {
      const data = await googleRes.value.json();
      const vol = (data.items as GoogleBooksVolume[] | undefined)?.[0]?.volumeInfo;
      if (vol) {
        if (vol.description) description = vol.description;
        if (vol.pageCount && vol.pageCount > 0) pages = vol.pageCount;
      }
    }

    // OpenBD（より詳細な内容紹介を優先）
    if (openBDRes.status === "fulfilled" && openBDRes.value.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: Array<any | null> = await openBDRes.value.json();
      const entry = entries?.[0];
      if (entry) {
        const textContents: Array<{ TextType?: string; Text?: string }> = entry.onix?.CollateralDetail?.TextContent ?? [];
        const detailed = textContents.find((tc) => tc.TextType === "03");
        const short = textContents.find((tc) => tc.TextType === "02");
        if (detailed?.Text || short?.Text) description = (detailed?.Text || short?.Text) as string;

        const extents: Array<{ ExtentType?: string; ExtentValue?: string }> = entry.onix?.DescriptiveDetail?.Extent ?? [];
        const pageExtent = extents.find((e) => e.ExtentType === "11");
        if (pageExtent?.ExtentValue) { const p = parseInt(pageExtent.ExtentValue, 10); if (!isNaN(p) && p > 0) pages = p; }
      }
    }

    // 欠けているフィールドのみ更新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (!book.description && description) updates.description = description;
    if (!book.pages && pages) updates.pages = pages;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ updated: false, message: "新しい情報はありませんでした" });
    }

    await prisma.book.update({ where: { id: bookId }, data: updates });
    revalidatePath("/", "layout");
    return NextResponse.json({ updated: true, fields: Object.keys(updates) });
  } catch {
    return NextResponse.json({ error: "再取得に失敗しました" }, { status: 500 });
  }
}

async function searchBooks(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const titleParam = searchParams.get("title");
  const authorParam = searchParams.get("author");
  const publisherParam = searchParams.get("publisher");

  // フィールド指定検索かどうか判定
  const hasFieldParams = titleParam || authorParam || publisherParam;

  // バリデーション: q またはフィールドのいずれかが2文字以上必要
  if (!hasFieldParams && (!q || q.trim().length < 2)) {
    return NextResponse.json({ error: "検索パラメータが必要です（2文字以上）" }, { status: 400 });
  }
  if (hasFieldParams) {
    const anyLongEnough = [titleParam, authorParam, publisherParam].some(
      (v) => v && v.trim().length >= 2
    );
    if (!anyLongEnough) {
      return NextResponse.json({ error: "いずれかのフィールドに2文字以上入力してください" }, { status: 400 });
    }
  }

  // ISBN検索モード（バーコード用）
  const isbnMatch = q?.match(/^isbn[:\s]*(\d{10,13})$/i);

  let googleQuery: string;
  let ndlPromise: Promise<Candidate[]>;

  if (isbnMatch) {
    // ISBN検索
    const isbn = isbnMatch[1];
    googleQuery = `isbn:${isbn}`;
    ndlPromise = searchNdlForCandidates(isbn, "isbn");

    // Google Booksで見つからない場合のフォールバック用に先行ISBN検索
    const isbnUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    isbnUrl.searchParams.set("q", `isbn:${isbn}`);
    isbnUrl.searchParams.set("maxResults", "5");
    isbnUrl.searchParams.set("printType", "books");
    if (process.env.GOOGLE_BOOKS_API_KEY) isbnUrl.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
    const isbnRes = await fetch(isbnUrl.toString());
    const isbnData = isbnRes.ok ? await isbnRes.json() : { items: [] };

    if (!isbnData.items || isbnData.items.length === 0) {
      try {
        const obdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
        if (obdRes.ok) {
          const obdData = await obdRes.json();
          const title = obdData?.[0]?.summary?.title;
          if (title) googleQuery = `intitle:${title}`;
        }
      } catch { /* fallback */ }
    }
  } else if (hasFieldParams) {
    // フィールド指定検索: Google Books クエリ構築
    const googleParts: string[] = [];
    if (titleParam) googleParts.push(`intitle:${titleParam}`);
    if (authorParam) googleParts.push(`inauthor:${authorParam}`);
    if (publisherParam) googleParts.push(`inpublisher:${publisherParam}`);
    googleQuery = googleParts.join("+");

    // NDL フィールド指定検索
    const ndlFields: NdlFieldQuery = {};
    if (titleParam) ndlFields.title = titleParam;
    if (authorParam) ndlFields.author = authorParam;
    if (publisherParam) ndlFields.publisher = publisherParam;
    ndlPromise = searchNdlForCandidates(ndlFields, "fields");
  } else {
    // 従来のキーワード検索（q パラメータ）
    const cleaned = q!.replace(/[\u3000\u00A0]/g, " ").replace(/\s+/g, " ").trim();
    googleQuery = cleaned;
    ndlPromise = searchNdlForCandidates(cleaned, "keyword");
  }

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", googleQuery);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  if (process.env.GOOGLE_BOOKS_API_KEY) url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const [googleResult, ndlResult] = await Promise.allSettled([fetch(url.toString()), ndlPromise]);
  if (googleResult.status === "rejected" || !googleResult.value.ok) {
    return NextResponse.json({ error: "書籍情報の取得に失敗しました" }, { status: 502 });
  }

  const data = await googleResult.value.json();
  const items: GoogleBooksVolume[] = data.items ?? [];
  const sorted = [...items].sort((a, b) => {
    const aJa = isJapanese(a.volumeInfo) ? 0 : 1;
    const bJa = isJapanese(b.volumeInfo) ? 0 : 1;
    if (aJa !== bJa) return aJa - bJa;
    return (extractYear(b.volumeInfo?.publishedDate) ?? 0) - (extractYear(a.volumeInfo?.publishedDate) ?? 0);
  });

  const candidates: Candidate[] = [];
  const seenIsbns = new Set<string>();
  const seenTitles = new Set<string>();

  for (const item of sorted) {
    const vol = item.volumeInfo;
    if (!vol?.title) continue;
    const isbn = extractIsbn(vol.industryIdentifiers);
    const normIsbn = isbn ? normalizeIsbn(isbn) : null;
    if (normIsbn) { if (seenIsbns.has(normIsbn)) continue; seenIsbns.add(normIsbn); }
    const normTitle = normalizeTitle(vol.title);
    seenTitles.add(normTitle);
    const thumbnail = vol.imageLinks?.thumbnail ?? vol.imageLinks?.smallThumbnail ?? null;
    candidates.push({
      title: vol.title, author: vol.authors?.join("／") ?? "",
      publisherName: vol.publisher ?? "", publishedYear: extractYear(vol.publishedDate),
      pages: vol.pageCount && vol.pageCount > 0 ? vol.pageCount : null,
      description: vol.description ?? null,
      thumbnail: thumbnail ? thumbnail.replace(/^http:/, "https:") : null, isbn,
    });
  }

  const ndlCandidates = ndlResult.status === "fulfilled" ? ndlResult.value : [];
  for (const ndl of ndlCandidates) {
    const normIsbn = ndl.isbn ? normalizeIsbn(ndl.isbn) : null;
    if (normIsbn && seenIsbns.has(normIsbn)) continue;
    if (seenTitles.has(normalizeTitle(ndl.title))) continue;
    if (normIsbn) seenIsbns.add(normIsbn);
    seenTitles.add(normalizeTitle(ndl.title));
    candidates.push(ndl);
  }

  candidates.sort((a, b) => {
    const aJa = isCandidateJapanese(a) ? 0 : 1;
    const bJa = isCandidateJapanese(b) ? 0 : 1;
    if (aJa !== bJa) return aJa - bJa;
    return (b.publishedYear ?? 0) - (a.publishedYear ?? 0);
  });
  candidates.splice(8);

  if (candidates.length === 0) return NextResponse.json({ candidates: [] });

  // OpenBD補完
  const candidateIsbns = candidates.map((c) => c.isbn);
  const validIsbns = candidateIsbns.filter((isbn): isbn is string => isbn !== null);
  if (validIsbns.length > 0) {
    try {
      const openBDRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${validIsbns.join(",")}`);
      if (openBDRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openBDData: Array<any | null> = await openBDRes.json();
        const pagesMap: Record<string, number> = {};
        const descMap: Record<string, string> = {};
        const publisherMap: Record<string, string> = {};

        for (const entry of openBDData) {
          if (!entry) continue;
          const eIsbn = entry.summary?.isbn;
          if (!eIsbn) continue;
          if (entry.summary?.pages) { const p = parseInt(entry.summary.pages, 10); if (!isNaN(p) && p > 0) pagesMap[eIsbn] = p; }
          if (entry.summary?.publisher) publisherMap[eIsbn] = entry.summary.publisher;
          const extents: Array<{ ExtentType?: string; ExtentValue?: string }> = entry.onix?.DescriptiveDetail?.Extent ?? [];
          const pageExtent = extents.find((e) => e.ExtentType === "11");
          if (pageExtent?.ExtentValue) { const p = parseInt(pageExtent.ExtentValue, 10); if (!isNaN(p) && p > 0 && !pagesMap[eIsbn]) pagesMap[eIsbn] = p; }
          const textContents: Array<{ TextType?: string; Text?: string }> = entry.onix?.CollateralDetail?.TextContent ?? [];
          const detailed = textContents.find((tc) => tc.TextType === "03");
          const short = textContents.find((tc) => tc.TextType === "02");
          const desc = detailed?.Text || short?.Text;
          if (desc) descMap[eIsbn] = desc;
        }

        for (let i = 0; i < candidates.length; i++) {
          const cIsbn = candidateIsbns[i];
          if (!cIsbn) continue;
          if (candidates[i].pages === null && pagesMap[cIsbn]) candidates[i].pages = pagesMap[cIsbn];
          if (!candidates[i].publisherName && publisherMap[cIsbn]) candidates[i].publisherName = publisherMap[cIsbn];
          if (descMap[cIsbn]) candidates[i].description = descMap[cIsbn];
        }
      }
    } catch { /* OpenBD失敗時はそのまま */ }
  }

  return NextResponse.json({ candidates });
}

async function backfillIsbn() {
  const books = await prisma.book.findMany({ where: { isbn: null }, select: { id: true, title: true, author: true } });
  let updated = 0, failed = 0;

  for (const book of books) {
    try {
      const query = book.author ? `${book.title} ${book.author}` : book.title;
      const bUrl = new URL("https://www.googleapis.com/books/v1/volumes");
      bUrl.searchParams.set("q", query);
      bUrl.searchParams.set("maxResults", "5");
      bUrl.searchParams.set("printType", "books");
      if (process.env.GOOGLE_BOOKS_API_KEY) bUrl.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

      const res = await fetch(bUrl.toString());
      if (!res.ok) { failed++; continue; }
      const bData = await res.json();
      const bItems: GoogleBooksVolume[] = bData.items ?? [];

      let foundIsbn: string | null = null;
      for (const item of bItems) {
        const vol = item.volumeInfo;
        if (!vol?.title) continue;
        const isbn = extractIsbn(vol.industryIdentifiers);
        if (!isbn) continue;
        const nt = book.title.replace(/\s/g, "").toLowerCase();
        const nvt = vol.title.replace(/\s/g, "").toLowerCase();
        if (nt.includes(nvt) || nvt.includes(nt)) { foundIsbn = isbn; break; }
      }
      if (!foundIsbn && bItems.length > 0) {
        for (const item of bItems) {
          const isbn = extractIsbn(item.volumeInfo?.industryIdentifiers);
          if (isbn) { foundIsbn = isbn; break; }
        }
      }
      if (foundIsbn) { await prisma.book.update({ where: { id: book.id }, data: { isbn: foundIsbn } }); updated++; }
      else { failed++; }
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch { failed++; }
  }

  return NextResponse.json({ total: books.length, updated, failed, skipped: books.length - updated - failed });
}
