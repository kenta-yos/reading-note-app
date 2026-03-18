import { prisma } from "@/lib/prisma";
import BookList from "@/components/BookList";
import BookFilters from "@/components/BookFilters";
import ActionLink from "@/components/ActionLink";
import { BookListSkeleton } from "@/components/ui/BookCardSkeleton";
import { Suspense } from "react";
import { getAvailableYears } from "@/lib/stats";
import { BOOK_STATUSES } from "@/lib/types";
import { BookStatus as PrismaBookStatus } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 10;

async function getDisciplines(): Promise<string[]> {
  const rows = await prisma.book.findMany({
    where: { discipline: { not: null } },
    select: { discipline: true },
    distinct: ["discipline"],
    orderBy: { discipline: "asc" },
  });
  return rows.map((r) => r.discipline!);
}

type SearchParams = {
  q?: string;
  discipline?: string;
  year?: string;
  status?: string;
  take?: string;
};

async function BookListServer({ searchParams }: { searchParams: SearchParams }) {
  const { year, discipline, q, status, take: takeParam } = searchParams;
  const take = Math.min(Number(takeParam) || DEFAULT_PAGE_SIZE, 200);

  const validStatus = status && status in BOOK_STATUSES ? (status as PrismaBookStatus) : undefined;

  const where = {
    ...(year ? {
      readAt: {
        gte: new Date(parseInt(year), 0, 1),
        lt: new Date(parseInt(year) + 1, 0, 1),
      }
    } : {}),
    ...(discipline ? { discipline } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { author: { contains: q, mode: "insensitive" as const } },
      ]
    } : {}),
  };

  const orderBy = validStatus === "READ"
    ? { readAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [books, totalCount] = await Promise.all([
    prisma.book.findMany({ where, orderBy, take: take + 1 }),
    prisma.book.count({ where }),
  ]);

  const hasMore = books.length > take;
  const items = hasMore ? books.slice(0, take) : books;

  return (
    <BookList
      books={items.map((b) => ({
        ...b,
        readAt: b.readAt?.toISOString() ?? null,
        statusChangedAt: b.statusChangedAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
      }))}
      totalCount={totalCount}
      hasMore={hasMore}
    />
  );
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // デフォルトで「読みたい」タブを表示
  const effectiveParams = {
    ...params,
    status: params.status || (!params.q && !params.discipline && !params.year ? "WANT_TO_READ" : params.status),
  };

  const [disciplines, availableYears] = await Promise.all([
    getDisciplines(),
    getAvailableYears(),
  ]);
  const currentYear = new Date().getFullYear();
  const years = [...new Set([...availableYears, currentYear])].sort((a, b) => b - a);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">読書記録</h1>
          <p className="text-slate-500 text-sm mt-0.5">登録した本の一覧</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ActionLink
            href="/categories"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-lg text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
            spinnerClassName="w-4 h-4 text-slate-500"
          >
            🗂️
          </ActionLink>
        </div>
      </div>

      <Suspense>
        <BookFilters disciplines={disciplines} years={years}>
          <Suspense fallback={<BookListSkeleton />}>
            <BookListServer searchParams={effectiveParams} />
          </Suspense>
        </BookFilters>
      </Suspense>
    </div>
  );
}
