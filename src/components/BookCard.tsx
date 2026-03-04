"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";
import { useToast } from "./ui/Toast";
import { haptic } from "@/lib/haptics";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";

type BookCardProps = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number | null;
  category: string | null;
  rating: number | null;
  status: BookStatus;
  readAt: Date | null;
  statusChangedAt?: Date | null;
};

export default function BookCard({
  id,
  title,
  author,
  publisher,
  publishedYear,
  pages,
  category,
  rating,
  status,
  readAt,
  statusChangedAt,
}: BookCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const isVertical = useRef(false);
  const swipeLocked = useRef(false);

  const currentIndex = STATUS_FLOW.indexOf(status);
  const nextStatus = currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null;

  const handleTap = () => {
    if (loading || swiping) return;
    setLoading(true);
    router.push(`/books/${id}`);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isVertical.current = false;
    swipeLocked.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!nextStatus || swipeLocked.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Determine direction on first significant move
    if (!isVertical.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
      isVertical.current = true;
      return;
    }
    if (isVertical.current) return;

    // Only allow left swipe (negative dx)
    if (dx < -5) {
      setSwiping(true);
      setSwipeX(Math.max(dx, -120));
    }
  };

  const onTouchEnd = () => {
    if (swipeX < -80 && nextStatus) {
      // Snap to action position
      swipeLocked.current = true;
      setSwipeX(-100);
    } else {
      setSwipeX(0);
      setTimeout(() => setSwiping(false), 100);
    }
  };

  const handleSwipeAction = async () => {
    if (!nextStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        haptic("success");
        toast(`${BOOK_STATUSES[nextStatus].label}に変更しました`);
        router.refresh();
      }
    } finally {
      setSwipeX(0);
      setSwiping(false);
      swipeLocked.current = false;
      setLoading(false);
    }
  };

  const nextStatusColor = nextStatus
    ? nextStatus === "READING_STACK" ? "bg-amber-500" : nextStatus === "READING" ? "bg-blue-500" : "bg-green-500"
    : "";

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe action behind the card */}
      {nextStatus && swipeX < 0 && (
        <button
          onClick={handleSwipeAction}
          className={`absolute right-0 top-0 bottom-0 flex items-center justify-center text-white text-xs font-semibold z-10 ${nextStatusColor}`}
          style={{ width: Math.abs(swipeX) }}
        >
          {Math.abs(swipeX) >= 80 && (
            <span className="whitespace-nowrap px-2">
              {BOOK_STATUSES[nextStatus].label}
            </span>
          )}
        </button>
      )}

      <button
        onClick={handleTap}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition-all w-full"
        style={{
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
      >
        {/* ローディングオーバーレイ */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
            <Spinner className="w-6 h-6 text-blue-500" />
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {title}
          </h3>
          {rating && (
            <span className="text-xs text-amber-500 shrink-0">
              {"★".repeat(rating)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-1">{author ?? "著者不明"}</p>
        {(publisher || publishedYear) && (
          <p className="text-xs text-slate-400 mb-2">
            {[publisher, publishedYear ? `${publishedYear}年` : null]
              .filter(Boolean)
              .join("、")}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {category && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {category}
              </span>
            )}
          </div>
          {pages && <span className="text-xs text-slate-400">{pages} P</span>}
        </div>
        {status === "READ" && readAt ? (
          <p className="text-xs text-slate-400 mt-2">
            {new Date(readAt).toLocaleDateString("ja-JP")} 読了
          </p>
        ) : status !== "READ" ? (
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status === "WANT_TO_READ" ? "bg-purple-50 text-purple-600" :
              status === "READING_STACK" ? "bg-amber-50 text-amber-600" :
              "bg-blue-50 text-blue-600"
            }`}>
              {BOOK_STATUSES[status].label}
            </span>
            {statusChangedAt && (
              <span className="text-xs text-slate-400">
                {new Date(statusChangedAt).toLocaleDateString("ja-JP")}
              </span>
            )}
          </div>
        ) : null}
      </button>
    </div>
  );
}
