import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id?: string[] }> }
) {
  const { id } = await params;
  if (id && id.length > 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  const counts = await prisma.book.groupBy({
    by: ["category"],
    _count: { id: true },
    where: { category: { not: null } },
  });
  const countMap = new Map(counts.map((c) => [c.category, c._count.id]));

  return NextResponse.json(
    categories.map((cat) => ({
      ...cat,
      bookCount: countMap.get(cat.name) ?? 0,
    }))
  );
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
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "同名のカテゴリがすでに存在します" },
      { status: 409 }
    );
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

  const catId = id[0];
  const category = await prisma.category.findUnique({ where: { id: catId } });
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bookCount = await prisma.book.count({
    where: { category: category.name },
  });
  if (bookCount > 0) {
    return NextResponse.json(
      { error: `このカテゴリは ${bookCount} 冊の本に使用されているため削除できません` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id: catId } });
  return NextResponse.json({ success: true });
}
