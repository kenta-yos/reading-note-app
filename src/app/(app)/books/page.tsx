export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import BookList from "@/components/BookList";
import BookFilters from "@/components/BookFilters";
import ActionLink from "@/components/ActionLink";
import { Suspense } from "react";
import { getAvailableYears } from "@/lib/stats";
import { BOOK_STATUSES } from "@/lib/types";
import { BookStatus as PrismaBookStatus } from "@prisma/client";

const PAGE_SIZE = 10;

async function getCategories(): Promise<string[]> {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return cats.map((c) => c.name);
}

type SearchParams = {
  q?: string;
  category?: string;
  year?: string;
  status?: string;
};

async function BookListServer({ searchParams }: { searchParams: SearchParams }) {
  const { year, category, q, status } = searchParams;

  const validStatus = status && status in BOOK_STATUSES ? (status as PrismaBookStatus) : undefined;

  const where = {
    ...(year ? {
      readAt: {
        gte: new Date(parseInt(year), 0, 1),
        lt: new Date(parseInt(year) + 1, 0, 1),
      }
    } : {}),
    ...(category ? { category } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { author: { contains: q, mode: "insensitive" as const } },
      ]
    } : {}),
  };

  const orderBy = validStatus === "READ" || (!validStatus && !q)
    ? { readAt: "desc" as const }
    : { createdAt: "desc" as const };

  const [books, totalCount] = await Promise.all([
    prisma.book.findMany({ where, orderBy, take: PAGE_SIZE + 1 }),
    prisma.book.count({ where }),
  ]);

  const hasMore = books.length > PAGE_SIZE;
  const items = hasMore ? books.slice(0, PAGE_SIZE) : books;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // API呼び出し用のパラメータを構築
  const apiParams: Record<string, string> = {};
  if (q) apiParams.q = q;
  if (category) apiParams.category = category;
  if (year) apiParams.year = year;
  if (validStatus) apiParams.status = validStatus;

  return (
    <BookList
      initialBooks={JSON.parse(JSON.stringify(items))}
      initialCursor={nextCursor}
      totalCount={totalCount}
      searchParams={apiParams}
    />
  );
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, categories, availableYears] = await Promise.all([
    searchParams,
    getCategories(),
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
        <div className="flex items-center gap-2 shrink-0">
          <ActionLink
            href="/categories"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm min-h-[40px] min-w-[80px]"
            spinnerClassName="w-4 h-4 text-slate-500"
          >
            🗂️ 分類
          </ActionLink>
          <ActionLink
            href="/books/new"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors shadow-sm min-h-[40px] min-w-[96px]"
            spinnerClassName="w-4 h-4 text-white"
          >
            ➕ 登録する
          </ActionLink>
        </div>
      </div>

      <Suspense>
        <BookFilters categories={categories} years={years} />
      </Suspense>

      <Suspense
        fallback={
          <p className="text-slate-400 text-sm py-12 text-center">
            {params.q ? `「${params.q}」を検索中…` : "読み込み中…"}
          </p>
        }
      >
        <BookListServer searchParams={params} />
      </Suspense>
    </div>
  );
}
