import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    language?: string;
  };
};

function extractIsbn(
  identifiers: { type: string; identifier: string }[] | undefined
): string | null {
  if (!identifiers) return null;
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  return isbn13?.identifier ?? isbn10?.identifier ?? null;
}

async function main() {
  const books = await prisma.book.findMany({
    where: { isbn: null },
    select: { id: true, title: true, author: true },
  });

  console.log(`ISBN未設定の書籍: ${books.length}冊`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    try {
      const query = book.author ? `${book.title} ${book.author}` : book.title;
      const url = new URL("https://www.googleapis.com/books/v1/volumes");
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", "5");
      url.searchParams.set("printType", "books");
      if (process.env.GOOGLE_BOOKS_API_KEY) {
        url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.log(`  [${i + 1}/${books.length}] FAIL (API error): ${book.title}`);
        failed++;
        continue;
      }

      const data = await res.json();
      const items: GoogleBooksVolume[] = data.items ?? [];

      let foundIsbn: string | null = null;

      // タイトル部分一致を優先
      for (const item of items) {
        const vol = item.volumeInfo;
        if (!vol?.title) continue;
        const isbn = extractIsbn(vol.industryIdentifiers);
        if (!isbn) continue;

        const normalizedTitle = book.title.replace(/\s/g, "").toLowerCase();
        const normalizedVolTitle = vol.title.replace(/\s/g, "").toLowerCase();
        if (
          normalizedTitle.includes(normalizedVolTitle) ||
          normalizedVolTitle.includes(normalizedTitle)
        ) {
          foundIsbn = isbn;
          break;
        }
      }

      // 一致が見つからなくても最初のISBNを使用
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
        console.log(`  [${i + 1}/${books.length}] OK: ${book.title} → ${foundIsbn}`);
      } else {
        failed++;
        console.log(`  [${i + 1}/${books.length}] NOT FOUND: ${book.title}`);
      }

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (err) {
      failed++;
      console.log(`  [${i + 1}/${books.length}] ERROR: ${book.title} - ${err}`);
    }
  }

  console.log(`\n完了: ${updated}件更新, ${failed}件失敗`);
}

main().catch(console.error);
