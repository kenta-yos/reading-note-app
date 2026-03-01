"use client";

import { useState, useEffect, useCallback } from "react";
import RecommendCard from "./RecommendCard";

type Recommendation = {
  type: "book" | "paper";
  intent: "deepen" | "broaden";
  title: string;
  titleJa?: string;
  author: string;
  publisher?: string;
  year: string;
  isbn?: string;
  url?: string;
  reason: string;
  reasonJa?: string;
};

type SessionData = {
  id: string;
  recommendations: Recommendation[];
  createdAt: string;
};

type Step =
  | "idle"
  | "preparing"
  | "generating_queries"
  | "searching_ndl"
  | "searching_scholar"
  | "selecting"
  | "translating"
  | "saving"
  | "done";

const STEP_PERCENTS: Record<Step, number> = {
  idle: 0,
  preparing: 3,
  generating_queries: 8,
  searching_ndl: 20,
  searching_scholar: 30,
  selecting: 50,
  translating: 87,
  saving: 95,
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

    // selecting中はゆっくり進める
    if (step !== "selecting") return;

    let current = serverPercent || STEP_PERCENTS[step];
    const id = setInterval(() => {
      current += 0.3;
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
  history: SessionData[];
};

export default function RecommendSection({ history }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [serverPercent, setServerPercent] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<SessionData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const percent = useAnimatedPercent(step, serverPercent);

  const latest = current || history[0] || null;
  const pastHistory = current ? history : history.slice(1);

  const handleRecommend = useCallback(async () => {
    if (step !== "idle") return;
    setStep("preparing");
    setError(null);
    setMessage("読書データを準備中…");

    try {
      const res = await fetch("/api/lab/recommend", { method: "POST" });

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
                recommendations: data.recommendations,
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

  const renderRecommendations = (recs: Recommendation[]) => {
    const deepenRecs = recs.filter((r) => r.intent === "deepen");
    const broadenRecs = recs.filter((r) => r.intent === "broaden");

    return (
      <div className="space-y-6">
        {deepenRecs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-emerald-700 mb-3">
              深める
            </h3>
            <div className="space-y-3">
              {deepenRecs.map((rec, i) => (
                <RecommendCard key={i} rec={rec} />
              ))}
            </div>
          </div>
        )}
        {broadenRecs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-violet-700 mb-3">
              広げる
            </h3>
            <div className="space-y-3">
              {broadenRecs.map((rec, i) => (
                <RecommendCard key={i} rec={rec} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            おすすめの本・論文
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            読書履歴をもとに、次に読むべき本と論文をAIが提案します
          </p>
        </div>
      </div>

      {/* おすすめボタン */}
      <button
        onClick={handleRecommend}
        disabled={loading}
        className={[
          "w-full rounded-lg border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors",
          loading
            ? "border-cyan-300 bg-cyan-50 text-cyan-700 cursor-not-allowed"
            : "border-cyan-300 bg-cyan-50/50 text-cyan-700 hover:border-cyan-400 hover:bg-cyan-50",
        ].join(" ")}
      >
        {loading ? (
          <span className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              おすすめを探索中…
            </span>
            <span className="flex w-full items-center gap-2">
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-cyan-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 transition-all duration-700 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-8 text-right text-xs tabular-nums text-cyan-500">
                {percent}%
              </span>
            </span>
            {message && (
              <span className="text-xs font-normal text-cyan-500">
                {message}
              </span>
            )}
          </span>
        ) : (
          "おすすめを探す"
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}

      {/* 最新の結果 */}
      {latest && (
        <div className="mt-6">
          <p className="text-xs text-slate-400 mb-3">
            {new Date(latest.createdAt).getFullYear()}/
            {new Date(latest.createdAt).getMonth() + 1}/
            {new Date(latest.createdAt).getDate()} 時点 /{" "}
            {latest.recommendations.length}件
          </p>
          {renderRecommendations(latest.recommendations)}
        </div>
      )}

      {/* 履歴 */}
      {pastHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showHistory ? "▼" : "▶"} 過去のおすすめ（{pastHistory.length}件）
          </button>
          {showHistory && (
            <div className="mt-3 space-y-6">
              {pastHistory.map((s) => (
                <div
                  key={s.id}
                  className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                >
                  <p className="text-xs text-slate-400 mb-3">
                    {new Date(s.createdAt).getFullYear()}/
                    {new Date(s.createdAt).getMonth() + 1}/
                    {new Date(s.createdAt).getDate()} /{" "}
                    {s.recommendations.length}件
                  </p>
                  {renderRecommendations(s.recommendations)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
