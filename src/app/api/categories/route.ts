import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  // 各カテゴリの使用冊数を付加
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

export async function POST(req: Request) {
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
