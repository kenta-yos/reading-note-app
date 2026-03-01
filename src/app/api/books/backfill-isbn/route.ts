import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    language?: string;
  };
};

function extractIsbn(identifiers: { type: string; identifier: string }[] | undefined): string | null {
  if (!identifiers) return null;
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  return isbn13?.identifier ?? isbn10?.identifier ?? null;
}

export async function POST() {
  const books = await prisma.book.findMany({
    where: { isbn: null },
    select: { id: true, title: true, author: true },
  });

  let updated = 0;
  let failed = 0;

  for (const book of books) {
    try {
      // Google Books APIで検索
      const query = book.author
        ? `${book.title} ${book.author}`
        : book.title;
      const url = new URL("https://www.googleapis.com/books/v1/volumes");
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", "5");
      url.searchParams.set("printType", "books");
      if (process.env.GOOGLE_BOOKS_API_KEY) {
        url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        failed++;
        continue;
      }

      const data = await res.json();
      const items: GoogleBooksVolume[] = data.items ?? [];

      // タイトルが近い日本語書籍を優先
      let foundIsbn: string | null = null;
      for (const item of items) {
        const vol = item.volumeInfo;
        if (!vol?.title) continue;

        const isbn = extractIsbn(vol.industryIdentifiers);
        if (!isbn) continue;

        // タイトルが部分一致するか確認
        const normalizedTitle = book.title.replace(/\s/g, "").toLowerCase();
        const normalizedVolTitle = vol.title.replace(/\s/g, "").toLowerCase();
        if (normalizedTitle.includes(normalizedVolTitle) || normalizedVolTitle.includes(normalizedTitle)) {
          foundIsbn = isbn;
          break;
        }
      }

      // 完全一致が見つからなくても最初のISBNを使う
      if (!foundIsbn && items.length > 0) {
        for (const item of items) {
          const isbn = extractIsbn(item.volumeInfo?.industryIdentifiers);
          if (isbn) {
            foundIsbn = isbn;
            break;
          }
        }
      }

      if (foundIsbn) {
        await prisma.book.update({
          where: { id: book.id },
          data: { isbn: foundIsbn },
        });
        updated++;
      } else {
        failed++;
      }

      // レート制限対策: 100msウェイト
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    total: books.length,
    updated,
    failed,
    skipped: books.length - updated - failed,
  });
}
