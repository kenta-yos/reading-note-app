"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type Recommendation = {
  bookId: string;
  title: string;
  reason: string;
};

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; items: Recommendation[] }
  | { phase: "error"; message: string };

export default function NextReadClient() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const router = useRouter();
  const composingRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/books/next-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ phase: "error", message: data.error || "エラーが発生しました" });
        return;
      }

      if (!data.recommendations || data.recommendations.length === 0) {
        setState({ phase: "error", message: "推薦結果が見つかりませんでした" });
        return;
      }

      setState({ phase: "done", items: data.recommendations });
    } catch {
      setState({ phase: "error", message: "通信エラーが発生しました" });
    }
  }, [query]);

  const handleReset = () => {
    setState({ phase: "idle" });
    setQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          今の気分・興味
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !composingRef.current &&
              state.phase !== "loading"
            ) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="例: 最近疲れてるから軽く読めるエッセイ系がいい"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:ring-1 focus:ring-violet-300 outline-none resize-none"
          rows={2}
          disabled={state.phase === "loading"}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || state.phase === "loading"}
            className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-slate-300 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            {state.phase === "loading" ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-4 h-4 text-white" />
                考え中…
              </span>
            ) : (
              "聞いてみる"
            )}
          </button>
        </div>
      </div>

      {/* Loading */}
      {state.phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 text-violet-500">
          <Spinner className="w-8 h-8" />
          <p className="mt-3 text-sm text-violet-600">
            あなたの本棚から選んでいます…
          </p>
        </div>
      )}

      {/* Results */}
      {state.phase === "done" && (
        <div className="space-y-3">
          {state.items.map((item, i) => (
            <button
              key={item.bookId}
              onClick={() => router.push(`/books/${item.bookId}`)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              </div>
            </button>
          ))}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-violet-600 transition-colors"
            >
              もう一度聞く
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{state.message}</p>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-500 hover:text-red-700 underline transition-colors"
          >
            やり直す
          </button>
        </div>
      )}

      {/* Idle hint */}
      {state.phase === "idle" && (
        <div className="flex flex-col items-center py-8 text-slate-400">
          <span className="text-3xl mb-2">✨</span>
          <p className="text-sm text-center">
            気分や興味を入力すると
            <br />
            あなたの本棚からぴったりの5冊を選びます
          </p>
        </div>
      )}
    </div>
  );
}
