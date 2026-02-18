import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const books = await prisma.book.findMany({
    where: {
      ...(year ? {
        readAt: {
          gte: new Date(parseInt(year), 0, 1),
          lt: new Date(parseInt(year) + 1, 0, 1),
        }
      } : {}),
      ...(category ? { category } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
        ]
      } : {}),
    },
    orderBy: { readAt: "desc" },
  });

  return NextResponse.json(books);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, author, publisher, publishedYear, pages, category, rating, notes, readAt } = body;

    const book = await prisma.book.create({
      data: {
        title,
        author: author || null,
        publisher: publisher || null,
        publishedYear: publishedYear ? Number(publishedYear) : null,
        pages: Number(pages),
        category: category || null,
        rating: rating ? Number(rating) : null,
        notes: notes || null,
        readAt: readAt ? new Date(readAt) : null,
      },
    });

    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}
