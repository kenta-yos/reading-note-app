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

  return (
    <div ref={ref} className="flex items-center gap-3">
      {/* ステップドット */}
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((key, i) => {
          const isActive = key === status;
          const isPast = i < currentIndex;
          return (
            <div key={key} className="flex items-center">
              {i > 0 && (
                <div className={`w-4 h-px ${isPast || isActive ? "bg-slate-300" : "bg-slate-150"}`} />
              )}
              <button
                onClick={() => changeStatus(key)}
                disabled={loading}
                className={`w-5 h-5 rounded-full transition-all ${
                  isActive
                    ? `${DOT_COLORS[key]} shadow-sm ring-2 ring-offset-1 ring-${key === "WANT_TO_READ" ? "purple" : key === "READING_STACK" ? "amber" : key === "READING" ? "blue" : "green"}-200`
                    : isPast
                    ? "bg-slate-300"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
                title={BOOK_STATUSES[key].label}
              />
            </div>
          );
        })}
      </div>

      {/* 現在ステータスラベル（タップでドロップダウン） */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1"
        >
          {loading ? (
            <Spinner className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <>
              {BOOK_STATUSES[status].label}
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </>
          )}
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px] overflow-hidden">
            {STATUS_FLOW.map((key) => {
              const s = BOOK_STATUSES[key];
              const isActive = key === status;
              return (
                <button
                  key={key}
                  onClick={() => changeStatus(key)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
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
    </div>
  );
}
