import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 紐づいている本がある場合は削除不可
  const bookCount = await prisma.book.count({
    where: { category: category.name },
  });
  if (bookCount > 0) {
    return NextResponse.json(
      { error: `このカテゴリは ${bookCount} 冊の本に使用されているため削除できません` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
