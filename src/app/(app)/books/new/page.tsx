import BookForm from "@/components/BookForm";
import { BOOK_STATUSES, BookStatus } from "@/lib/types";

type SearchParams = {
  title?: string;
  author?: string;
  publisher?: string;
  publishedYear?: string;
  status?: string;
};

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const validStatus = params.status && params.status in BOOK_STATUSES
    ? (params.status as BookStatus)
    : undefined;

  const initialData = {
    ...(params.title ? { title: params.title } : {}),
    ...(params.author ? { author: params.author } : {}),
    ...(params.publisher ? { publisher: params.publisher } : {}),
    ...(params.publishedYear ? { publishedYear: Number(params.publishedYear) } : {}),
    ...(validStatus ? { status: validStatus } : {}),
  };

  const hasPreFill = !!(params.title || params.author || params.publisher);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">本を登録</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {hasPreFill ? "書籍情報が入力されています。カテゴリなどを設定して登録してください" : "新しい読書記録を追加します"}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-6 shadow-sm">
        <BookForm mode="create" initialData={initialData} returnStatus={validStatus} />
      </div>
    </div>
  );
}
