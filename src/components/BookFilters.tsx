"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";
import Spinner from "./Spinner";

type TabKey = BookStatus | null;

type Props = {
  disciplines: string[];
  years: number[];
  children?: React.ReactNode;
};

export default function BookFilters({ disciplines, years, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<TabKey>(null);

  // Swipe state
  const touchStart = useRef({ x: 0, y: 0 });
  const isSwipe = useRef(false);
  const directionLocked = useRef(false);

  const activeStatus = searchParams.get("status") as BookStatus | null;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("take");
      startTransition(() => {
        router.push(`/books?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const navigateTab = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = activeStatus ? STATUS_FLOW.indexOf(activeStatus) : -1;
      let nextIndex: number;
      if (direction === "left") {
        // swipe left = next tab
        nextIndex = currentIndex + 1;
      } else {
        // swipe right = previous tab
        nextIndex = currentIndex - 1;
      }
      if (nextIndex < 0 || nextIndex >= STATUS_FLOW.length) return;
      const nextStatus = STATUS_FLOW[nextIndex];
      setPendingTab(nextStatus);
      updateParam("status", nextStatus);
    },
    [activeStatus, updateParam]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isSwipe.current = false;
    directionLocked.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (directionLocked.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Lock direction after threshold
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      directionLocked.current = true;
      isSwipe.current = Math.abs(dx) > Math.abs(dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isSwipe.current || isPending) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) < 50) return; // minimum swipe distance
    navigateTab(dx < 0 ? "left" : "right");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    clearTimeout(debounceTimer.current);
    const value = e.target.value;
    debounceTimer.current = setTimeout(() => {
      setIsTyping(false);
      updateParam("q", value);
    }, 300);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="space-y-3 mb-5 lg:mb-6">
        {/* ステータスタブ — sticky on scroll */}
        <div className="flex border-b border-slate-200 sticky top-0 z-30 bg-slate-50 -mx-4 px-4 lg:-mx-8 lg:px-8 pt-1">
          {STATUS_FLOW.map((key) => {
            const { label, color } = BOOK_STATUSES[key];
            const isActive = activeStatus === key;
            const isLoading = isPending && pendingTab === key;
            const colorMap = {
              purple: isActive ? "border-purple-500 text-purple-700" : "text-slate-400 hover:text-purple-600",
              amber: isActive ? "border-amber-500 text-amber-700" : "text-slate-400 hover:text-amber-600",
              blue: isActive ? "border-blue-500 text-blue-700" : "text-slate-400 hover:text-blue-600",
              green: isActive ? "border-green-500 text-green-700" : "text-slate-400 hover:text-green-600",
            };
            return (
              <button
                key={key}
                onClick={() => {
                  setPendingTab(isActive ? null : key);
                  updateParam("status", isActive ? "" : key);
                }}
                disabled={isPending}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? colorMap[color] : `border-transparent ${colorMap[color]}`
                } ${isPending ? "opacity-60" : ""}`}
              >
                {isLoading ? (
                  <Spinner className="w-4 h-4 mx-auto text-slate-400" />
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1">
          <input
            type="text"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="タイトル・著者を検索..."
            onChange={handleSearchChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-sm"
            style={{ fontSize: "16px" }}
          />
          {isTyping && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              検索中…
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select
            defaultValue={searchParams.get("discipline") ?? ""}
            onChange={(e) => updateParam("discipline", e.target.value)}
            className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
          >
            <option value="">すべての分野</option>
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            defaultValue={searchParams.get("year") ?? ""}
            onChange={(e) => updateParam("year", e.target.value)}
            className="flex-1 sm:flex-none p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
          >
            <option value="">すべての年</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      {/* スワイプ対象のコンテンツエリア */}
      {children}
    </div>
  );
}
