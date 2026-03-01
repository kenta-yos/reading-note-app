import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import ActionLink from "@/components/ActionLink";
import StatusChanger from "@/components/StatusChanger";
import Link from "next/link";
import { BookStatus } from "@/lib/types";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  const keywords = await prisma.bookKeyword.findMany({
    where: { bookId: id, keyword: { not: "__api_error__" } },
    select: { keyword: true },
    orderBy: { count: "desc" },
  });

  if (!book) notFound();

  const readAtLabel = book.readAt
    ? new Date(book.readAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* 戻るボタン + パンくず */}
      <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
        <ActionLink
          href="/books"
          className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
          spinnerClassName="w-3.5 h-3.5 text-slate-400"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          一覧に戻る
        </ActionLink>
        <span>/</span>
        <span className="text-slate-600 truncate">{book.title}</span>
      </div>

      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 leading-snug mb-1">
          {book.title}
        </h1>
        {book.author && (
          <p className="text-slate-500 text-sm">{book.author}</p>
        )}
        {(book.publisher || book.publishedYear) && (
          <p className="text-xs text-slate-400 mt-0.5">
            {[book.publisher, book.publishedYear ? `${book.publishedYear}年刊` : null]
              .filter(Boolean)
              .join("　")}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <ActionLink
            href={`/books/${id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm min-w-[72px] justify-center"
            spinnerClassName="w-4 h-4 text-white"
          >
            編集する
          </ActionLink>
          <DeleteButton id={id} />
        </div>
      </div>

      {/* ステータス */}
      <div className="mb-4">
        <StatusChanger bookId={book.id} currentStatus={book.status as BookStatus} />
      </div>

      {/* メタ情報 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {book.category && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {book.category}
          </span>
        )}
        {book.rating && (
          <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
            {"★".repeat(book.rating)}{"☆".repeat(5 - book.rating)}
          </span>
        )}
        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
          {book.pages.toLocaleString()} ページ
        </span>
        {readAtLabel && (
          <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
            {readAtLabel} 読了
          </span>
        )}
      </div>

      {/* 内容紹介 */}
      {book.description && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            内容紹介
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {book.description}
          </p>
        </div>
      )}

      {/* 抽出された概念 */}
      {keywords.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            抽出された概念
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map(({ keyword }) => (
              <span
                key={keyword}
                className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 感想 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          感想・メモ
        </h2>
        {book.notes?.trim() ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {book.notes.trim()}
          </p>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 mb-3">感想はまだ記録されていません</p>
            <ActionLink
              href={`/books/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
              spinnerClassName="w-4 h-4 text-slate-400"
            >
              感想を書く →
            </ActionLink>
          </div>
        )}
      </div>
    </div>
  );
}
