"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefetchButton({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleRefetch() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/books/refetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const data = await res.json();
      if (data.updated) {
        setResult("更新しました");
        router.refresh();
      } else {
        setResult(data.message ?? "新しい情報はありませんでした");
      }
    } catch {
      setResult("取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefetch}
        disabled={loading}
        className="text-xs text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
        )}
        情報を再取得
      </button>
      {result && (
        <span className="text-xs text-slate-400">{result}</span>
      )}
    </div>
  );
}
