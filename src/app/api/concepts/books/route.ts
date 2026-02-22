import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const concept = searchParams.get("concept");
  if (!concept) return NextResponse.json({ error: "concept required" }, { status: 400 });

  const books = await prisma.book.findMany({
    where: {
      keywords: { some: { keyword: concept } },
      readAt: { not: null },
    },
    select: { id: true, title: true, author: true, readAt: true, rating: true },
    orderBy: { readAt: "desc" },
  });

  return NextResponse.json(books);
}
