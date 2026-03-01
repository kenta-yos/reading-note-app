import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { BookStatus as PrismaBookStatus } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  const where = {
    ...(year ? {
      readAt: {
        gte: new Date(parseInt(year), 0, 1),
        lt: new Date(parseInt(year) + 1, 0, 1),
      }
    } : {}),
    ...(category ? { category } : {}),
    ...(status && Object.values(PrismaBookStatus).includes(status as PrismaBookStatus)
      ? { status: status as PrismaBookStatus }
      : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { author: { contains: q, mode: "insensitive" as const } },
      ]
    } : {}),
  };

  const orderBy = status === "READ" || (!status && !q)
    ? { readAt: "desc" as const }
    : { createdAt: "desc" as const };

  const totalCount = await prisma.book.count({ where });

  const books = await prisma.book.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = books.length > limit;
  const items = hasMore ? books.slice(0, limit) : books;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    books: items,
    nextCursor,
    totalCount,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, author, publisher, publishedYear, pages, category, discipline, rating, description, notes, readAt, status } = body;

    const bookStatus = (status as PrismaBookStatus) || "READ";

    // readAt同期: READなら今日を自動セット、非READならnull
    let resolvedReadAt: Date | null = null;
    if (bookStatus === "READ") {
      resolvedReadAt = readAt ? new Date(readAt) : new Date();
    }

    const book = await prisma.book.create({
      data: {
        title,
        author: author || null,
        publisher: publisher || null,
        publishedYear: publishedYear ? Number(publishedYear) : null,
        pages: Number(pages),
        category: category || null,
        discipline: discipline || null,
        rating: rating ? Number(rating) : null,
        description: description || null,
        notes: notes || null,
        status: bookStatus,
        readAt: resolvedReadAt,
      },
    });

    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}
