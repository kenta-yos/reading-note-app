"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
