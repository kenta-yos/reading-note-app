import BookForm from "@/components/BookForm";

export default function NewBookPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">本を登録</h1>
        <p className="text-slate-500 text-sm mt-1">新しい読書記録を追加します</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <BookForm mode="create" />
      </div>
    </div>
  );
}
