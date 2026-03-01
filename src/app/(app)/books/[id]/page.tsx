import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import ActionLink from "@/components/ActionLink";
import BackButton from "@/components/BackButton";
import StatusChanger from "@/components/StatusChanger";
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

  const bookUrl = book.isbn ? `https://www.hanmoto.com/bd/isbn/${book.isbn}` : null;

  const meta = [
    book.category,
    book.rating ? "★".repeat(book.rating) + "☆".repeat(5 - book.rating) : null,
    book.pages ? `${book.pages.toLocaleString()}p` : null,
    readAtLabel ? `${readAtLabel} 読了` : null,
  ].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ナビゲーション: 戻る / 編集 / 削除 */}
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-1">
          <ActionLink
            href={`/books/${id}/edit`}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            spinnerClassName="w-5 h-5 text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </ActionLink>
          <DeleteButton id={id} />
        </div>
      </div>

      {/* 書籍情報カード */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
        <h1 className="text-lg lg:text-xl font-bold text-slate-800 leading-snug">
          {bookUrl ? (
            <a
              href={bookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 transition-colors inline-flex items-center gap-1"
            >
              {book.title}
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ) : (
            book.title
          )}
        </h1>
        {book.author && (
          <p className="text-slate-500 text-sm mt-1">{book.author}</p>
        )}
        {(book.publisher || book.publishedYear) && (
          <p className="text-xs text-slate-400 mt-0.5">
            {[book.publisher, book.publishedYear ? `${book.publishedYear}年刊` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        {/* ステータス */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <StatusChanger bookId={book.id} currentStatus={book.status as BookStatus} />
        </div>

        {/* メタ情報 */}
        {meta.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            {meta.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
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
          <p className="text-sm text-slate-400">まだ記録されていません</p>
        )}
      </div>
    </div>
  );
}
