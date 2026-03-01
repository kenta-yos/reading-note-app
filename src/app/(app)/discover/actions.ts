"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchRecentBooks, fetchUpcomingBooks, enrichWithPrices } from "@/lib/ndl";
import type { NDLBook } from "@/lib/ndl";

export async function toggleBookmark(book: NDLBook): Promise<void> {
  if (!book.isbn) return;
  const isbn = book.isbn.replace(/-/g, "");

  const existing = await prisma.discoverBookmark.findUnique({ where: { isbn } });
  if (existing) {
    await prisma.discoverBookmark.delete({ where: { isbn } });
  } else {
    await prisma.discoverBookmark.create({
      data: {
        isbn,
        title: book.title,
        author: book.author || null,
        publisher: book.publisher || null,
        issued: book.issued,
        ndcCode: book.ndcCode || null,
        discipline: book.discipline || null,
        ndlUrl: book.ndlUrl || null,
      },
    });
  }
  revalidatePath("/discover");
}

export async function syncNewBooks(): Promise<{ added: number; addedIsbns: string[] }> {
  const publishers = await prisma.watchPublisher.findMany({ orderBy: { name: "asc" } });
  const publisherNames = publishers.map((p) => p.name);

  if (publisherNames.length === 0) return { added: 0, addedIsbns: [] };

  const [recentRaw, upcomingRaw] = await Promise.all([
    fetchRecentBooks(publisherNames),
    fetchUpcomingBooks(publisherNames),
  ]);

  // recent と upcoming の重複排除（今月分が重複する）
  const seen = new Set<string>();
  const allRaw: NDLBook[] = [];
  for (const b of [...recentRaw, ...upcomingRaw]) {
    const key = b.isbn ?? b.title;
    if (!seen.has(key)) { seen.add(key); allRaw.push(b); }
  }

  const allEnriched = await enrichWithPrices(allRaw);

  // 1ヶ月以上前（前月より古い月）の書籍を先に削除（日本時間基準）
  const todayJST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  const [jy, jm, jd] = todayJST.split("-").map(Number);
  const oneMonthAgo = new Date(jy, jm - 2, jd);
  const expiredYM = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, "0")}`;
  await prisma.discoveredBook.deleteMany({ where: { issued: { lt: expiredYM } } });

  // 既存のISBNを取得
  const existingIsbns = new Set(
    (await prisma.discoveredBook.findMany({ select: { isbn: true } })).map((b) => b.isbn)
  );

  const newBooks = allEnriched.filter(
    (b) => b.isbn && !existingIsbns.has(b.isbn.replace(/-/g, ""))
  );

  if (newBooks.length === 0) {
    revalidatePath("/discover");
    return { added: 0, addedIsbns: [] };
  }

  const result = await prisma.discoveredBook.createMany({
    data: newBooks.map((book) => ({
      isbn: book.isbn!.replace(/-/g, ""),
      title: book.title,
      author: book.author || null,
      publisher: book.publisher || null,
      issued: book.issued,
      price: book.price ?? null,
      ndcCode: book.ndcCode || null,
      discipline: book.discipline || null,
      ndlUrl: book.ndlUrl || null,
    })),
    skipDuplicates: true,
  });

  const addedIsbns = newBooks.map((b) => b.isbn!.replace(/-/g, ""));

  revalidatePath("/discover");
  return { added: result.count, addedIsbns };
}
