"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInterested, dismissEvent } from "@/app/events/actions";

const SOURCE_LABEL: Record<string, string> = {
  connpass: "connpass",
  scj: "日本学術会議",
  misuzu: "みすず書房",
  keiso: "勁草書房",
  iwanami: "岩波書店",
  kinokuniya: "紀伊國屋",
  "tsutaya-daikanyama": "代官山蔦屋",
  maruzenjunkudo: "丸善ジュンク堂",
  "google-cse": "Google検索",
};

type Props = {
  id: string;
  source: string;
  title: string;
  url: string;
  startDate: string | null;
  venue: string | null;
  matchedAuthors: string[];
  status: "PENDING" | "INTERESTED" | "DISMISSED";
};

export default function EventCard({
  id,
  source,
  title,
  url,
  startDate,
  venue,
  matchedAuthors,
  status,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleInterested() {
    startTransition(async () => {
      await markInterested(id);
      router.refresh();
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissEvent(id);
      router.refresh();
    });
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
      {/* ヘッダー: 著者タグ + ソース */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {matchedAuthors.map((a) => (
            <span
              key={a}
              className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium"
            >
              {a}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">
          {SOURCE_LABEL[source] ?? source}
        </span>
      </div>

      {/* タイトル */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-slate-800 hover:text-blue-600 leading-snug"
      >
        {title}
      </a>

      {/* 日時・会場 */}
      <div className="text-xs text-slate-500 flex gap-3">
        <span>{startDate ?? "日時未定"}</span>
        {venue && <span>{venue}</span>}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 mt-1">
        {status === "PENDING" && (
          <button
            onClick={handleInterested}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-amber-600 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            ★ 興味あり
          </button>
        )}
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="flex items-center gap-1 text-xs text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          × 削除
        </button>
      </div>
    </div>
  );
}
