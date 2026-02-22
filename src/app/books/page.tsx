import { prisma } from "@/lib/prisma";
import BookCard from "@/components/BookCard";
import BookFilters from "@/components/BookFilters";
import ActionLink from "@/components/ActionLink";
import { Suspense } from "react";
import { getAvailableYears } from "@/lib/stats";

async function getCategories(): Promise<string[]> {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return cats.map((c) => c.name);
}

type SearchParams = {
  q?: string;
  category?: string;
  year?: string;
};

async function BookList({ searchParams }: { searchParams: SearchParams }) {
  const { year, category, q } = searchParams;

  const books = await prisma.book.findMany({
    where: {
      ...(year ? {
        readAt: {
          gte: new Date(parseInt(year), 0, 1),
          lt: new Date(parseInt(year) + 1, 0, 1),
        }
      } : {}),
      ...(category ? { category } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
        ]
      } : {}),
    },
    orderBy: { readAt: "desc" },
  });

  if (books.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-12">
        {q ? `「${q}」に一致する本は見つかりません` : "本が登録されていません"}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {books.map((book) => (
        <BookCard
          key={book.id}
          id={book.id}
          title={book.title}
          author={book.author}
          publisher={book.publisher}
          publishedYear={book.publishedYear}
          pages={book.pages}
          category={book.category}
          rating={book.rating}
          readAt={book.readAt}
        />
      ))}
    </div>
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
        <BookList searchParams={params} />
      </Suspense>
    </div>
  );
}
