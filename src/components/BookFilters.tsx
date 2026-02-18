"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CATEGORIES } from "@/lib/types";

export default function BookFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="タイトル・著者を検索..."
        onChange={(e) => updateParam("q", e.target.value)}
        className="flex-1 min-w-48 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
      />
      <select
        defaultValue={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
        className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
      >
        <option value="">すべてのカテゴリ</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("year") ?? ""}
        onChange={(e) => updateParam("year", e.target.value)}
        className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
      >
        <option value="">すべての年</option>
        {[2026, 2025, 2024, 2023].map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
    </div>
  );
}
