"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";
import Spinner from "./Spinner";

type Props = {
  categories: string[];
  years: number[];
};

export default function BookFilters({ categories, years }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // フィルタ変更時はページネーションをリセット
      params.delete("take");
      startTransition(() => {
        router.push(`/books?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsTyping(true);
    clearTimeout(debounceTimer.current);
    const value = e.target.value;
    debounceTimer.current = setTimeout(() => {
      setIsTyping(false);
      updateParam("q", value);
    }, 300);
  };

  const activeStatus = searchParams.get("status") as BookStatus | null;

  return (
    <div className="space-y-3 mb-5 lg:mb-6">
      {/* ステータスタブ */}
      <div className="flex border-b border-slate-200 relative">
        {STATUS_FLOW.map((key) => {
          const { label, color } = BOOK_STATUSES[key];
          const isActive = activeStatus === key;
          const colorMap = {
            purple: isActive ? "border-purple-500 text-purple-700" : "text-slate-400 hover:text-purple-600",
            amber: isActive ? "border-amber-500 text-amber-700" : "text-slate-400 hover:text-amber-600",
            blue: isActive ? "border-blue-500 text-blue-700" : "text-slate-400 hover:text-blue-600",
            green: isActive ? "border-green-500 text-green-700" : "text-slate-400 hover:text-green-600",
          };
          return (
            <button
              key={key}
              onClick={() => updateParam("status", isActive ? "" : key)}
              disabled={isPending}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                isActive ? colorMap[color] : `border-transparent ${colorMap[color]}`
              } ${isPending ? "opacity-60" : ""}`}
            >
              {label}
            </button>
          );
        })}
        {isPending && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <Spinner className="w-4 h-4 text-slate-400" />
          </div>
        )}
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
          defaultValue={searchParams.get("category") ?? ""}
          onChange={(e) => updateParam("category", e.target.value)}
          className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
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
  );
}
