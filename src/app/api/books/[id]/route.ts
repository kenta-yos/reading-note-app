import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { BookStatus as PrismaBookStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(book);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { title, author, publisher, publishedYear, pages, category, discipline, rating, description, notes, readAt, status } = body;

    // 変更前のBookを取得してステータス比較
    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const newStatus = (status as PrismaBookStatus) ?? existingBook.status;

    // readAt同期ロジック
    let resolvedReadAt: Date | null = existingBook.readAt;
    if (newStatus === "READ" && existingBook.status !== "READ") {
      // READに変更 → readAtが未設定なら今日を自動セット
      resolvedReadAt = existingBook.readAt ?? new Date();
    } else if (newStatus !== "READ" && existingBook.status === "READ") {
      // READから他ステータスに変更 → readAtをnullクリア
      resolvedReadAt = null;
    } else if (newStatus === "READ") {
      // READ→READの場合はbodyのreadAtを尊重
      resolvedReadAt = readAt ? new Date(readAt) : existingBook.readAt;
    }

    const book = await prisma.book.update({
      where: { id },
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
        status: newStatus,
        readAt: resolvedReadAt,
      },
    });

    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { status } = await req.json();
    const newStatus = status as PrismaBookStatus;

    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // readAt同期ロジック
    let resolvedReadAt: Date | null = existingBook.readAt;
    if (newStatus === "READ" && existingBook.status !== "READ") {
      resolvedReadAt = existingBook.readAt ?? new Date();
    } else if (newStatus !== "READ" && existingBook.status === "READ") {
      resolvedReadAt = null;
    }

    const book = await prisma.book.update({
      where: { id },
      data: { status: newStatus, readAt: resolvedReadAt },
    });

    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}
