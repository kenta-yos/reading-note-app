import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditBookForm from "@/components/EditBookForm";
import DeleteButton from "@/components/DeleteButton";
import Link from "next/link";
import type { Book } from "@/lib/types";

export default async function BookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) notFound();

  const typedBook: Book = {
    ...book,
    discipline: book.discipline,
    readAt: book.readAt,
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* パンくずリスト */}
      <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
        <Link href="/books" className="hover:text-slate-600 transition-colors">
          読書記録
        </Link>
        <span>/</span>
        <Link href={`/books/${id}`} className="hover:text-slate-600 transition-colors truncate max-w-[160px]">
          {book.title}
        </Link>
        <span>/</span>
        <span className="text-slate-600">編集</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">{book.title}</h1>
          {book.author && (
            <p className="text-slate-500 text-sm mt-0.5">{book.author}</p>
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
