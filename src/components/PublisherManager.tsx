"use client";

import { useState, useTransition } from "react";

type Publisher = { id: string; name: string };

type Props = {
  initialPublishers: Publisher[];
};

export default function PublisherManager({ initialPublishers }: Props) {
  const [publishers, setPublishers] = useState<Publisher[]>(initialPublishers);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "already exists" ? "すでに登録済みです" : "追加に失敗しました");
        return;
      }
      const created: Publisher = await res.json();
      setPublishers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ja"))
      );
      setInput("");
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を監視対象から削除しますか？`)) return;
    startTransition(async () => {
      const res = await fetch("/api/publishers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      setPublishers((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return (
    <div>
      {/* 追加フォーム */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="出版社名を入力"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          追加
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

      {/* 出版社リスト */}
      <ul className="divide-y divide-slate-100">
        {publishers.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-slate-700">{p.name}</span>
            <button
              onClick={() => handleDelete(p.id, p.name)}
              disabled={isPending}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
            >
              削除
            </button>
          </li>
        ))}
        {publishers.length === 0 && (
          <li className="py-8 text-center text-slate-400 text-sm">
            出版社が登録されていません
          </li>
        )}
      </ul>
    </div>
  );
}
