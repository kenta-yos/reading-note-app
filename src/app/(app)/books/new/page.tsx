import BookForm from "@/components/BookForm";

type SearchParams = {
  title?: string;
  author?: string;
  publisher?: string;
  publishedYear?: string;
};

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const initialData = {
    ...(params.title ? { title: params.title } : {}),
    ...(params.author ? { author: params.author } : {}),
    ...(params.publisher ? { publisher: params.publisher } : {}),
    ...(params.publishedYear ? { publishedYear: Number(params.publishedYear) } : {}),
  };

  const hasPreFill = Object.keys(initialData).length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">本を登録</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {hasPreFill ? "書籍情報が入力されています。カテゴリなどを設定して登録してください" : "新しい読書記録を追加します"}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-6 shadow-sm">
        <BookForm mode="create" initialData={initialData} />
      </div>
    </div>
  );
}
