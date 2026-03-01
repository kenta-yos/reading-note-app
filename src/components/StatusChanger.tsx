"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";
import Spinner from "./Spinner";

type Props = {
  bookId: string;
  currentStatus: BookStatus;
};

const DOT_COLORS: Record<BookStatus, string> = {
  WANT_TO_READ: "bg-purple-500",
  READING_STACK: "bg-amber-500",
  READING: "bg-blue-500",
  READ: "bg-green-500",
};

const BADGE_COLORS: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
};

const NAV_COLORS: Record<string, { bg: string; hover: string }> = {
  purple: { bg: "bg-purple-50 text-purple-600 border-purple-200", hover: "hover:bg-purple-100" },
  amber: { bg: "bg-amber-50 text-amber-600 border-amber-200", hover: "hover:bg-amber-100" },
  blue: { bg: "bg-blue-50 text-blue-600 border-blue-200", hover: "hover:bg-blue-100" },
  green: { bg: "bg-green-50 text-green-600 border-green-200", hover: "hover:bg-green-100" },
};

export default function StatusChanger({ bookId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<BookStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeStatus = async (newStatus: BookStatus) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = STATUS_FLOW.indexOf(status);
  const prevStatus = currentIndex > 0 ? STATUS_FLOW[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null;

  const { label, color } = BOOK_STATUSES[status];

  return (
    <div ref={ref} className="space-y-3">
      {/* ステップインジケーター */}
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((key, i) => {
          const isActive = key === status;
          const isPast = i < currentIndex;
          return (
            <div key={key} className="flex items-center">
              {i > 0 && (
                <div className={`w-5 h-0.5 ${isPast || isActive ? "bg-slate-300" : "bg-slate-100"}`} />
              )}
              <button
                onClick={() => changeStatus(key)}
                disabled={loading}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isActive
                    ? `${DOT_COLORS[key]} text-white shadow-sm scale-110`
                    : isPast
                    ? "bg-slate-300 text-white"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
                title={BOOK_STATUSES[key].label}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
        <span className="ml-2 text-xs text-slate-400">
          {label}
        </span>
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex items-center gap-2">
        {/* 戻るボタン */}
        {prevStatus && !loading ? (
          <button
            onClick={() => changeStatus(prevStatus)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${NAV_COLORS[BOOK_STATUSES[prevStatus].color].bg} ${NAV_COLORS[BOOK_STATUSES[prevStatus].color].hover}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {BOOK_STATUSES[prevStatus].label}
          </button>
        ) : (
          <div />
        )}

        {/* 現在のステータスバッジ（クリックでドロップダウン） */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg border font-medium text-xs transition-all ${BADGE_COLORS[color]} hover:opacity-80`}
          >
            {loading ? <Spinner className="w-3.5 h-3.5" /> : label}
          </button>

          {open && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[150px] overflow-hidden">
              {STATUS_FLOW.map((key) => {
                const s = BOOK_STATUSES[key];
                const isActive = key === status;
                return (
                  <button
                    key={key}
                    onClick={() => changeStatus(key)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-slate-50 font-medium text-slate-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLORS[key]}`} />
                    {s.label}
                    {isActive && (
                      <svg className="w-3.5 h-3.5 ml-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 進むボタン */}
        {nextStatus && !loading ? (
          <button
            onClick={() => changeStatus(nextStatus)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${NAV_COLORS[BOOK_STATUSES[nextStatus].color].bg} ${NAV_COLORS[BOOK_STATUSES[nextStatus].color].hover}`}
          >
            {BOOK_STATUSES[nextStatus].label}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
