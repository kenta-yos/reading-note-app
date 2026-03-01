"use client";

import { useState, useCallback } from "react";

type Props = {
  pdfUrl: string;
  title: string;
};

type TranslationState =
  | { status: "idle" }
  | { status: "loading"; step: string; percent: number; message: string }
  | { status: "done"; fullText: string; pageCount: number; chunks: string[] }
  | { status: "error"; error: string };

export default function PaperTranslation({ pdfUrl, title }: Props) {
  const [state, setState] = useState<TranslationState>({ status: "idle" });
  const [chunks, setChunks] = useState<string[]>([]);

  const handleTranslate = useCallback(async () => {
    setState({ status: "loading", step: "fetching_pdf", percent: 0, message: "開始中…" });
    setChunks([]);

    try {
      const res = await fetch("/api/lab/translate-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      });

      if (!res.body) {
        setState({ status: "error", error: "ストリームを取得できませんでした" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const collectedChunks: string[] = [];

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
            } else if (eventType === "chunk") {
              collectedChunks.push(data.text);
              setChunks([...collectedChunks]);
            } else if (eventType === "error") {
              setState({ status: "error", error: data.error });
              return;
            } else if (eventType === "done") {
              setState({
                status: "done",
                fullText: data.fullText,
                pageCount: data.pageCount,
                chunks: collectedChunks,
              });
              return;
            }
          }
        }
      }
    } catch {
      setState({ status: "error", error: "通信エラーが発生しました" });
    }
  }, [pdfUrl]);

  if (state.status === "idle") {
    return (
      <button
        onClick={handleTranslate}
        className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
      >
        「{title.length > 40 ? title.slice(0, 40) + "…" : title}」を全文翻訳
      </button>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span className="text-xs text-slate-600">{state.message}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${state.percent}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-slate-400 w-8 text-right">
            {state.percent}%
          </span>
        </div>
        {/* Show chunks as they arrive */}
        {chunks.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {chunks.join("\n\n")}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-xs text-red-600">{state.error}</p>
        <button
          onClick={handleTranslate}
          className="mt-2 text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          再試行
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-emerald-700 font-medium">
          翻訳完了（{state.pageCount}ページ）
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(state.fullText);
          }}
          className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
        >
          コピー
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto rounded border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
          {state.fullText}
        </div>
      </div>
    </div>
  );
}
