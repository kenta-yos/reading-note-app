import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    const { title, author, pages, category, tags, rating, notes, readAt } = body;

    const book = await prisma.book.update({
      where: { id },
      data: {
        title,
        author: author || null,
        pages: Number(pages),
        category: category || null,
        tags: tags ?? [],
        rating: rating ? Number(rating) : null,
        notes: notes || null,
        readAt: readAt ? new Date(readAt) : null,
      },
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
