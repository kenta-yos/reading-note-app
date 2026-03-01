"use client";

import { useMemo, useState } from "react";

type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  discipline: string | null;
  readYear: number;
  pageCount: number;
};

type SortKey = "readYear" | "title" | "author";

const PAGE_SIZE = 10;

type Props = {
  books: PublicBook[];
  filterYear: number | null;
  filterDiscipline: string | null;
  onYearChange: (year: number | null) => void;
  onDisciplineChange: (discipline: string | null) => void;
};

export default function BookList({
  books,
  filterYear,
  filterDiscipline,
  onYearChange,
  onDisciplineChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("readYear");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const years = useMemo(
    () => [...new Set(books.map((b) => b.readYear))].sort((a, b) => b - a),
    [books]
  );
  const disciplines = useMemo(
    () =>
      [...new Set(books.map((b) => b.discipline).filter(Boolean) as string[])]
        .filter((d) => d !== "未分類")
        .sort(),
    [books]
  );

  const filtered = useMemo(() => {
    let result = books;
    if (filterYear) result = result.filter((b) => b.readYear === filterYear);
    if (filterDiscipline)
      result = result.filter((b) => b.discipline === filterDiscipline);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "readYear") return (a.readYear - b.readYear) * dir;
      if (sortKey === "title") return a.title.localeCompare(b.title) * dir;
      return (a.author ?? "").localeCompare(b.author ?? "") * dir;
    });
  }, [books, filterYear, filterDiscipline, search, sortKey, sortAsc]);

  // Reset visible count when filters change
  const filteredKey = `${filterYear}-${filterDiscipline}-${search}-${sortKey}-${sortAsc}`;
  const [prevKey, setPrevKey] = useState(filteredKey);
  if (filteredKey !== prevKey) {
    setPrevKey(filteredKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key !== "readYear");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">
        読了書籍リスト
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        全{books.length}冊
        {filtered.length !== books.length && `（絞り込み：${filtered.length}冊）`}
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="タイトル・著者で検索…"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
        <select
          value={filterYear ?? ""}
          onChange={(e) =>
            onYearChange(e.target.value ? Number(e.target.value) : null)
          }
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        >
          <option value="">全年</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          value={filterDiscipline ?? ""}
          onChange={(e) =>
            onDisciplineChange(e.target.value || null)
          }
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        >
          <option value="">全分野</option>
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th
                className="text-left py-2 px-2 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort("title")}
              >
                タイトル{sortIndicator("title")}
              </th>
              <th
                className="text-left py-2 px-2 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort("author")}
              >
                著者{sortIndicator("author")}
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">
                分野
              </th>
              <th
                className="text-right py-2 px-2 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort("readYear")}
              >
                読了年{sortIndicator("readYear")}
              </th>
              <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">
                ページ
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((b, i) => (
              <tr
                key={`${b.title}-${i}`}
                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-2 px-2 text-slate-700 font-medium">
                  {b.title}
                </td>
                <td className="py-2 px-2 text-slate-500">{b.author ?? "—"}</td>
                <td className="py-2 px-2">
                  {b.discipline && b.discipline !== "未分類" && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                      {b.discipline}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-right text-slate-500 tabular-nums">
                  {b.readYear}
                </td>
                <td className="py-2 px-2 text-right text-slate-400 tabular-nums">
                  {b.pageCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {visible.map((b, i) => (
          <div
            key={`${b.title}-${i}`}
            className="border border-slate-100 rounded-lg p-3"
          >
            <p className="text-sm font-medium text-slate-700 mb-1">
              {b.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {b.author && <span>{b.author}</span>}
              <span className="tabular-nums">{b.readYear}年</span>
              <span className="tabular-nums text-slate-400">
                {b.pageCount.toLocaleString()}P
              </span>
            </div>
            {b.discipline && b.discipline !== "未分類" && (
              <span className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                {b.discipline}
              </span>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-8">
          該当する書籍が見つかりません
        </p>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-5 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            もっと見る（残り {filtered.length - visibleCount} 冊）
          </button>
        </div>
      )}
    </div>
  );
}
