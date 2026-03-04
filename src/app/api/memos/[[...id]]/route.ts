import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string[] }> }
) {
  const { id } = await params;
  if (id && id.length > 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const where = bookId ? { bookId } : {};

  const memos = await prisma.readingMemo.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      book: { select: { id: true, title: true, author: true } },
    },
  });

  const hasMore = memos.length > limit;
  const items = hasMore ? memos.slice(0, limit) : memos;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ memos: items, nextCursor });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id?: string[] }> }
) {
  const { id } = await params;
  if (id && id.length > 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { bookId, content, quote, page } = await req.json();

    if (!bookId || !content?.trim()) {
      return NextResponse.json({ error: "bookId と content は必須です" }, { status: 400 });
    }

    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { status: true } });
    if (!book) {
      return NextResponse.json({ error: "書籍が見つかりません" }, { status: 404 });
    }
    if (book.status !== "READING") {
      return NextResponse.json({ error: "読中の本のみメモを追加できます" }, { status: 400 });
    }

    const memo = await prisma.readingMemo.create({
      data: {
        bookId,
        content: content.trim(),
        quote: quote?.trim() || null,
        page: page ? Number(page) : null,
      },
      include: {
        book: { select: { id: true, title: true, author: true } },
      },
    });

    revalidatePath("/memo");
    return NextResponse.json(memo);
  } catch {
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id?: string[] }> }
) {
  const { id } = await params;
  if (!id || id.length === 0) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    await prisma.readingMemo.delete({ where: { id: id[0] } });
    revalidatePath("/memo");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}
