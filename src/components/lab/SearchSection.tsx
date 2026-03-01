"use client";

import { useState } from "react";
import RecommendCard from "./RecommendCard";
import NaturalSearchInput from "./NaturalSearchInput";

type Recommendation = {
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
};

type SessionData = {
  id: string;
  recommendations: Recommendation[];
  userQuery?: string;
  createdAt: string;
};

type Props = {
  history: SessionData[];
};

export default function SearchSection({ history }: Props) {
  const [current, setCurrent] = useState<SessionData | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const latest = current || history[0] || null;
  const pastHistory = current ? history : history.slice(1);

  const renderRecommendations = (recs: Recommendation[]) => {
    const bookRecs = recs.filter((r) => r.type === "book");
    const paperRecs = recs.filter((r) => r.type === "paper");

    return (
      <div className="space-y-6">
        {bookRecs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-700 mb-3">
              書籍（{bookRecs.length}冊）
            </h3>
            <div className="space-y-3">
              {bookRecs.map((rec, i) => (
                <RecommendCard key={i} rec={rec} />
              ))}
            </div>
          </div>
        )}
        {paperRecs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-sky-700 mb-3">
              論文（{paperRecs.length}本）
            </h3>
            <div className="space-y-3">
              {paperRecs.map((rec, i) => (
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
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700">
          本・論文を探す
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          読みたいテーマを自然文で入力すると、AIが本と論文を探します
        </p>
      </div>

      <NaturalSearchInput onResult={setCurrent} />

      {/* 最新の結果 */}
      {latest && (
        <div className="mt-6">
          <p className="text-xs text-slate-400 mb-3">
            {new Date(latest.createdAt).getFullYear()}/
            {new Date(latest.createdAt).getMonth() + 1}/
            {new Date(latest.createdAt).getDate()} 時点 /{" "}
            {latest.recommendations.length}件
            {latest.userQuery && (
              <span className="ml-2 text-slate-500">
                「{latest.userQuery}」
              </span>
            )}
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
            {showHistory ? "▼" : "▶"} 過去の検索結果（{pastHistory.length}件）
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
                    {s.userQuery && (
                      <span className="ml-2 text-slate-500">
                        「{s.userQuery}」
                      </span>
                    )}
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
