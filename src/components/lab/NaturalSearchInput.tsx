"use client";

import { useState, useCallback } from "react";

type Question = {
  id: string;
  question: string;
  options: string[];
};

type SessionData = {
  id: string;
  recommendations: {
    type: "book" | "paper";
    title: string;
    titleJa?: string;
    author: string;
    publisher?: string;
    year: string;
    isbn?: string;
    url?: string;
    openAccessPdfUrl?: string;
    reason: string;
    reasonJa?: string;
  }[];
  searchType?: string;
  userQuery?: string;
  createdAt: string;
};

type Props = {
  onResult: (session: SessionData) => void;
  disabled?: boolean;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading"; step: string; percent: number; message: string }
  | { status: "clarify"; questions: Question[] }
  | { status: "error"; error: string };

export default function NaturalSearchInput({ onResult, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const processSSE = useCallback(
    async (res: Response, userQuery: string) => {
      if (!res.body) {
        setState({ status: "error", error: "ストリームを取得できませんでした" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "progress") {
              setState({
                status: "loading",
                step: data.step,
                percent: data.percent ?? 0,
                message: data.message || "",
              });
            } else if (eventType === "clarify") {
              setState({ status: "clarify", questions: data.questions });
              return;
            } else if (eventType === "error") {
              setState({ status: "error", error: data.error });
              return;
            } else if (eventType === "done") {
              onResult({
                id: data.id,
                recommendations: data.recommendations,
                userQuery,
                createdAt: new Date().toISOString(),
              });
              setState({ status: "idle" });
              setQuery("");
              setAnswers({});
              return;
            }
          }
        }
      }
    },
    [onResult]
  );

  const handleSearch = useCallback(async () => {
    if (!query.trim() || disabled) return;
    setState({
      status: "loading",
      step: "preparing",
      percent: 0,
      message: "検索を開始中…",
    });

    try {
      const res = await fetch("/api/lab/recommend/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: query.trim() }),
      });
      await processSSE(res, query.trim());
    } catch {
      setState({ status: "error", error: "通信エラーが発生しました" });
    }
  }, [query, disabled, processSSE]);

  const handleSubmitAnswers = useCallback(async () => {
    if (state.status !== "clarify") return;

    const formattedAnswers = state.questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || "",
    }));

    setState({
      status: "loading",
      step: "generating_queries",
      percent: 8,
      message: "回答を踏まえてクエリを生成中…",
    });

    try {
      const res = await fetch("/api/lab/recommend/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: query.trim(),
          answers: formattedAnswers,
        }),
      });
      await processSSE(res, query.trim());
    } catch {
      setState({ status: "error", error: "通信エラーが発生しました" });
    }
  }, [state, query, answers, processSSE]);

  const isLoading = state.status === "loading";

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch();
          }}
          placeholder="読みたい本を自然文で検索（例: 「認知科学と教育の関係について」）"
          disabled={isLoading || disabled}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading || disabled}
          className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          検索
        </button>
      </div>

      {/* Loading state */}
      {state.status === "loading" && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="text-xs text-cyan-700">{state.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-cyan-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-cyan-500 w-8 text-right">
              {state.percent}%
            </span>
          </div>
        </div>
      )}

      {/* Clarification questions */}
      {state.status === "clarify" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4">
          <p className="text-xs text-amber-700 font-medium">
            より良い結果のために確認させてください
          </p>
          {state.questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm text-slate-700 mb-2">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                    }
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      answers[q.id] === opt
                        ? "bg-amber-600 text-white"
                        : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {/* Free text input */}
              <input
                type="text"
                placeholder="または自由に入力"
                value={
                  answers[q.id] &&
                  !q.options.includes(answers[q.id])
                    ? answers[q.id]
                    : ""
                }
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-amber-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
          ))}
          <button
            onClick={handleSubmitAnswers}
            disabled={state.questions.some((q) => !answers[q.id])}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            この内容で検索する
          </button>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
    </div>
  );
}
