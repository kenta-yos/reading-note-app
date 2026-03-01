"use client";

import { useState } from "react";
import PaperTranslation from "./PaperTranslation";

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

export default function RecommendCard({ rec }: { rec: Recommendation }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const displayTitle = rec.titleJa || rec.title;
  const displayReason = rec.reasonJa || rec.reason;
  const isBook = rec.type === "book";

  // 版元ドットコムリンク (ISBN検索)
  const hanmotoUrl = rec.isbn
    ? `https://www.hanmoto.com/bd/isbn/${rec.isbn}`
    : null;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isBook
          ? "bg-amber-50 border-amber-100"
          : "bg-sky-50 border-sky-100"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isBook
              ? "bg-amber-100 text-amber-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {isBook ? "書籍" : "論文"}
        </span>
      </div>

      <p
        className={`text-sm font-semibold mb-1 ${
          isBook ? "text-amber-900" : "text-sky-900"
        }`}
      >
        {displayTitle}
      </p>

      {rec.titleJa && rec.title !== rec.titleJa && (
        <p className="text-xs text-slate-400 mb-1">{rec.title}</p>
      )}

      <p className="text-xs text-slate-500 mb-2">
        {rec.author}
        {rec.publisher && ` / ${rec.publisher}`}
        {rec.year && ` (${rec.year})`}
      </p>

      <p className="text-sm text-slate-700 leading-relaxed mb-3">
        {displayReason}
      </p>

      {/* Links */}
      <div className="flex flex-wrap items-center gap-2">
        {isBook && hanmotoUrl && (
          <a
            href={hanmotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-700 hover:text-amber-800 hover:underline"
          >
            版元ドットコム
          </a>
        )}
        {!isBook && rec.url && (
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-700 hover:text-sky-800 hover:underline"
          >
            Semantic Scholar
          </a>
        )}
        {!isBook && rec.openAccessPdfUrl && (
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            {showTranslation ? "翻訳を閉じる" : "全文翻訳する"}
          </button>
        )}
      </div>

      {/* Paper translation */}
      {showTranslation && rec.openAccessPdfUrl && (
        <div className="mt-3">
          <PaperTranslation pdfUrl={rec.openAccessPdfUrl} title={rec.title} />
        </div>
      )}
    </div>
  );
}
