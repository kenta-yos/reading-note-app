"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type Props = {
  categories: string[];
  years: number[];
};

export default function BookFilters({ categories, years }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/books?${params.toString()}`);
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

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-5 lg:mb-6">
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
  );
}
