"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/types";

type BookFormProps = {
  initialData?: {
    id?: string;
    title?: string;
    author?: string;
    pages?: number;
    category?: string;
    tags?: string[];
    rating?: number;
    notes?: string;
    readAt?: string;
  };
  mode?: "create" | "edit";
};

export default function BookForm({ initialData = {}, mode = "create" }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initialData.title ?? "");
  const [author, setAuthor] = useState(initialData.author ?? "");
  const [pages, setPages] = useState(String(initialData.pages ?? ""));
  const [category, setCategory] = useState(initialData.category ?? "");
  const [tagsInput, setTagsInput] = useState((initialData.tags ?? []).join(", "));
  const [rating, setRating] = useState(String(initialData.rating ?? ""));
  const [notes, setNotes] = useState(initialData.notes ?? "");
  const [readAt, setReadAt] = useState(
    initialData.readAt
      ? new Date(initialData.readAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title,
      author,
      pages: Number(pages),
      category: category || null,
      tags,
      rating: rating ? Number(rating) : null,
      notes,
      readAt,
    };

    try {
      const url =
        mode === "edit" ? `/api/books/${initialData.id}` : "/api/books";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("保存に失敗しました");

      router.push("/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：存在と時間"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">著者</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="例：ハイデガー"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ページ数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="450"
            min="1"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            読了日
          </label>
          <input
            type="date"
            value={readAt}
            onChange={(e) => setReadAt(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            カテゴリ
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">選択なし</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            評価 (1–5)
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">なし</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          タグ（カンマ区切り）
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="例：存在論, 現象学, ドイツ哲学"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          メモ・感想
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="読んで気づいたこと、重要な概念など..."
          rows={4}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "保存中..." : mode === "edit" ? "更新する" : "登録する"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
