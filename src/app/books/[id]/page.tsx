import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditBookForm from "@/components/EditBookForm";
import Link from "next/link";
import type { Book } from "@/lib/types";

async function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { redirect } = await import("next/navigation");
        await prisma.book.delete({ where: { id } });
        redirect("/books");
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
      >
        削除
      </button>
    </form>
  );
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) notFound();

  const typedBook: Book = {
    ...book,
    readAt: book.readAt,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/books" className="text-slate-400 hover:text-slate-600 text-sm">
          ← 読書記録
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600 truncate">{book.title}</span>
      </div>

      <div className="flex items-start justify-between mb-5 lg:mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold text-slate-800 leading-snug">{book.title}</h1>
          {book.author && (
            <p className="text-slate-500 mt-1">{book.author}</p>
          )}
          {(book.publisher || book.publishedYear) && (
            <p className="text-sm text-slate-400 mt-0.5">
              {[book.publisher, book.publishedYear ? `${book.publishedYear}年` : null]
                .filter(Boolean)
                .join("、")}
            </p>
          )}
        </div>
        <DeleteButton id={id} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600 mb-5">情報を編集</h2>
        <EditBookForm book={typedBook} />
      </div>
    </div>
  );
}
