"use client";

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

export default function RecommendCard({ rec }: { rec: Recommendation }) {
  const displayTitle = rec.titleJa || rec.title;
  const displayReason = rec.reasonJa || rec.reason;
  const isDeepen = rec.intent === "deepen";

  return (
    <div
      className={`border rounded-lg p-4 ${
        isDeepen
          ? "bg-emerald-50 border-emerald-100"
          : "bg-violet-50 border-violet-100"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isDeepen
              ? "bg-emerald-100 text-emerald-700"
              : "bg-violet-100 text-violet-700"
          }`}
        >
          {isDeepen ? "深める" : "広げる"}
        </span>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
            rec.type === "book"
              ? "bg-slate-100 text-slate-600"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {rec.type === "book" ? "書籍" : "論文"}
        </span>
      </div>

      <p
        className={`text-sm font-semibold mb-1 ${
          isDeepen ? "text-emerald-900" : "text-violet-900"
        }`}
      >
        {rec.url ? (
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {displayTitle}
          </a>
        ) : (
          displayTitle
        )}
      </p>

      {rec.titleJa && rec.title !== rec.titleJa && (
        <p className="text-xs text-slate-400 mb-1">{rec.title}</p>
      )}

      <p className="text-xs text-slate-500 mb-2">
        {rec.author}
        {rec.publisher && ` / ${rec.publisher}`}
        {rec.year && ` (${rec.year})`}
      </p>

      <p className="text-sm text-slate-700 leading-relaxed">{displayReason}</p>
    </div>
  );
}
