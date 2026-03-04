import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import descriptions from "@/lib/concept-descriptions.json";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const action = slug[0];

  if (action === "books") {
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

  if (action === "description") {
    const { searchParams } = new URL(req.url);
    const concept = searchParams.get("concept");
    if (!concept) return NextResponse.json({ error: "concept required" }, { status: 400 });

    const map = descriptions as Record<string, string>;
    const text = map[concept] ?? null;
    return NextResponse.json({ description: text || null });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
