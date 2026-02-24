"use client";

import { useState, useTransition } from "react";
import Spinner from "@/components/Spinner";
import { syncNewBooks } from "@/app/discover/actions";

export default function DiscoverSyncButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ added: number } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const r = await syncNewBooks();
      setResult(r);
    });
  }

  return (
    <button
      onClick={handleSync}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {isPending ? (
        <>
          <Spinner className="w-3.5 h-3.5" />
          <span>取得中...</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>新刊を取得</span>
        </>
      )}
      {result && !isPending && (
        <span className={result.added > 0 ? "text-green-600 ml-0.5" : "text-slate-400 ml-0.5"}>
          ({result.added > 0 ? `${result.added}件追加` : "新着なし"})
        </span>
      )}
    </button>
  );
}
