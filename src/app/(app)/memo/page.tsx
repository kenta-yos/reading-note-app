import { prisma } from "@/lib/prisma";
import MemoTimeline from "./MemoTimeline";

export default async function MemoPage() {
  const readingBooks = await prisma.book.findMany({
    where: { status: "READING" },
    select: { id: true, title: true },
    orderBy: { statusChangedAt: "desc" },
  });

  if (readingBooks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-3xl mb-3">📖</p>
        <p className="text-slate-600 font-medium">読中の本がありません</p>
        <p className="text-sm text-slate-400 mt-1">
          本のステータスを「読中」に変更すると、ここでメモを投稿できます
        </p>
      </div>
    );
  }

  return <MemoTimeline readingBooks={readingBooks} />;
}
