"use client";

import { useState, useEffect, useCallback } from "react";
import InsightCard from "./InsightCard";

type InsightData = {
  id: string;
  analysis: {
    discoveries: { title: string; books: string[]; insight: string }[];
    evolution: {
      period: string;
      theme: string;
      description: string;
      keyBooks: string[];
    }[];
  };
  bookCount: number;
  createdAt: string;
};

type Step =
  | "idle"
  | "preparing"
  | "analyzing"
  | "saving"
  | "done";

const STEP_PERCENTS: Record<Step, number> = {
  idle: 0,
  preparing: 5,
  analyzing: 15,
  saving: 90,
  done: 100,
};

function useAnimatedPercent(step: Step, serverPercent: number) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (serverPercent > 0) {
      setPercent(serverPercent);
    } else {
      setPercent(STEP_PERCENTS[step]);
    }

    // analyzing中はゆっくり進める
    if (step !== "analyzing") return;

    let current = serverPercent || STEP_PERCENTS[step];
    const id = setInterval(() => {
      current += 0.4;
      if (current >= 85) {
        clearInterval(id);
        return;
      }
      setPercent(Math.round(current));
    }, 500);

    return () => clearInterval(id);
  }, [step, serverPercent]);

  return percent;
}

type Props = {
  history: InsightData[];
};

export default function InsightsSection({ history }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [serverPercent, setServerPercent] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<InsightData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const percent = useAnimatedPercent(step, serverPercent);

  const latest = current || history[0] || null;
  const pastHistory = current
    ? history
    : history.slice(1);

  const handleAnalyze = useCallback(async () => {
    if (step !== "idle") return;
    setStep("preparing");
    setError(null);
    setMessage("読書データを準備中…");

    try {
      const res = await fetch("/api/lab/insights", { method: "POST" });

      if (!res.body) {
        setError("ストリームを取得できませんでした");
        setStep("idle");
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
              setStep(data.step as Step);
              setServerPercent(data.percent ?? 0);
              setMessage(data.message || "");
            } else if (eventType === "error") {
              setError(data.error);
              setStep("idle");
              return;
            } else if (eventType === "done") {
              setCurrent({
                id: data.id,
                analysis: data.analysis,
                bookCount: data.bookCount,
                createdAt: new Date().toISOString(),
              });
              setStep("done");
              setTimeout(() => setStep("idle"), 2000);
              return;
            }
          }
        }
      }
    } catch {
      setError("通信エラーが発生しました");
      setStep("idle");
    }
  }, [step]);

  const loading = step !== "idle";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">読書分析</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            AIが読書履歴の全体像を分析し、本と本のつながり・関心の変遷を発見します
          </p>
        </div>
      </div>

      {/* 分析ボタン */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={[
          "w-full rounded-lg border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors",
          loading
            ? "border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed"
            : "border-amber-300 bg-amber-50/50 text-amber-700 hover:border-amber-400 hover:bg-amber-50",
        ].join(" ")}
      >
        {loading ? (
          <span className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              分析中…
            </span>
            <span className="flex w-full items-center gap-2">
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-amber-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-8 text-right text-xs tabular-nums text-amber-500">
                {percent}%
              </span>
            </span>
            {message && (
              <span className="text-xs font-normal text-amber-500">
                {message}
              </span>
            )}
          </span>
        ) : (
          "読書履歴を分析する"
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}

      {/* 最新の分析結果 */}
      {latest && (
        <div className="mt-6">
          <InsightCard
            analysis={latest.analysis}
            bookCount={latest.bookCount}
            createdAt={latest.createdAt}
          />
        </div>
      )}

      {/* 履歴 */}
      {pastHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showHistory ? "▼" : "▶"} 過去の分析（{pastHistory.length}件）
          </button>
          {showHistory && (
            <div className="mt-3 space-y-6">
              {pastHistory.map((h) => (
                <div
                  key={h.id}
                  className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                >
                  <InsightCard
                    analysis={h.analysis}
                    bookCount={h.bookCount}
                    createdAt={h.createdAt}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
