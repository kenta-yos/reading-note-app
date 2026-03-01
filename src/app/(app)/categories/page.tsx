"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

type CategoryWithCount = {
  id: string;
  name: string;
  bookCount: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "エラーが発生しました");
        return;
      }
      setNewName("");
      await fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryWithCount) => {
    setDeletingId(cat.id);
    setDeleteError((prev) => ({ ...prev, [cat.id]: "" }));
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError((prev) => ({ ...prev, [cat.id]: data.error ?? "削除失敗" }));
        return;
      }
      await fetchCategories();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">カテゴリ管理</h1>
        <p className="text-slate-500 text-sm mt-1">
          本のカテゴリを追加・削除できます
        </p>
      </div>

      {/* 追加フォーム */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">
          カテゴリを追加
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="カテゴリ名"
            className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>追加中...</span>
              </>
            ) : (
              "追加"
            )}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* カテゴリ一覧 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500">
            {loading ? "..." : `${categories.length} カテゴリ`}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-8">
            <Spinner className="w-4 h-4" />
            <span>読み込み中...</span>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            カテゴリがありません
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((cat) => {
              const isDeleting = deletingId === cat.id;
              const isDisabled = cat.bookCount > 0 || isDeleting || deletingId !== null;
              return (
                <li key={cat.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {cat.bookCount} 冊
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={isDisabled}
                      title={
                        cat.bookCount > 0
                          ? `${cat.bookCount} 冊に使用中のため削除できません`
                          : "削除"
                      }
                      className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      {isDeleting ? (
                        <>
                          <Spinner className="w-3 h-3" />
                          <span>削除中</span>
                        </>
                      ) : (
                        "削除"
                      )}
                    </button>
                  </div>
                  {deleteError[cat.id] && (
                    <p className="mt-1 text-xs text-red-500">{deleteError[cat.id]}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
