"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Spinner from "./Spinner";
import { DISCIPLINES } from "@/lib/disciplines";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), { ssr: false });

type BookCandidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
  pages: number | null;
  description: string | null;
  thumbnail: string | null;
};

type BookFormProps = {
  initialData?: {
    id?: string;
    title?: string;
    author?: string;
    publisher?: string;
    publishedYear?: number;
    pages?: number;
    category?: string;
    discipline?: string;
    rating?: number;
    description?: string;
    notes?: string;
    status?: BookStatus;
    readAt?: string;
  };
  mode?: "create" | "edit";
};

export default function BookForm({ initialData = {}, mode = "create" }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState(initialData.title ?? "");
  const [author, setAuthor] = useState(initialData.author ?? "");
  const [publisher, setPublisher] = useState(initialData.publisher ?? "");
  const [publishedYear, setPublishedYear] = useState(String(initialData.publishedYear ?? ""));
  const [pages, setPages] = useState(String(initialData.pages ?? ""));
  const [category, setCategory] = useState(initialData.category ?? "");
  const [discipline, setDiscipline] = useState(initialData.discipline ?? "");
  const [description, setDescription] = useState(initialData.description ?? "");

  // 検索用 state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const candidateRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.map((c: { name: string }) => c.name)));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (candidateRef.current && !candidateRef.current.contains(e.target as Node)) {
        setCandidates([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const applyCandidate = (candidate: BookCandidate) => {
    setTitle(candidate.title);
    setAuthor(candidate.author);
    setPublisher(candidate.publisherName);
    setPublishedYear(String(candidate.publishedYear ?? ""));
    if (candidate.pages) setPages(String(candidate.pages));
    setDescription(candidate.description ?? "");
    setCandidates([]);
    setSearchQuery("");
    setSearchError("");
  };

  const doSearch = useCallback(async (query: string) => {
    // 前のリクエストをキャンセル
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearchLoading(true);
    setSearchError("");

    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (controller.signal.aborted) return;

      if (!res.ok) {
        setSearchError(data.error ?? "検索に失敗しました");
        setCandidates([]);
        return;
      }

      if (data.candidates.length === 0) {
        setSearchError("書籍が見つかりませんでした");
        setCandidates([]);
        return;
      }

      setCandidates(data.candidates);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSearchError("検索中にエラーが発生しました");
      setCandidates([]);
    } finally {
      if (!controller.signal.aborted) {
        setSearchLoading(false);
      }
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 2) {
        setCandidates([]);
        setSearchError("");
        setSearchLoading(false);
        abortRef.current?.abort();
        return;
      }

      debounceRef.current = setTimeout(() => {
        if (!isComposing.current) {
          doSearch(value.trim());
        }
      }, 500);
    },
    [doSearch]
  );

  const handleBarcodeScan = useCallback(
    (isbn: string) => {
      setShowScanner(false);
      doSearch(`isbn:${isbn}`);
    },
    [doSearch]
  );

  const [status, setStatus] = useState<BookStatus>(initialData.status ?? "WANT_TO_READ");
  const [rating, setRating] = useState(String(initialData.rating ?? ""));
  const [notes, setNotes] = useState(initialData.notes ?? "");
  const [readAt, setReadAt] = useState(
    initialData.readAt
      ? new Date(initialData.readAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      title,
      author,
      publisher,
      publishedYear: publishedYear ? Number(publishedYear) : null,
      pages: Number(pages),
      category: category || null,
      discipline: discipline || null,
      rating: rating ? Number(rating) : null,
      description: description || null,
      notes,
      status,
      readAt: status === "READ" ? readAt : null,
    };

    try {
      const url =
        mode === "edit" ? `/api/books/${initialData.id}` : "/api/books";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("保存に失敗しました");

      router.push(mode === "edit" ? `/books/${initialData.id}` : "/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* バーコードスキャナー */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 検索セクション（新規登録時のみ） */}
      {mode === "create" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-blue-800">
              書籍を検索
            </label>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M1 4.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 2H3.25A2.25 2.25 0 001 4.25zM1 7.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 5H3.25A2.25 2.25 0 001 7.25zM7 8a1 1 0 000 2h6a1 1 0 100-2H7zM3.25 8A2.25 2.25 0 001 10.25v5.5A2.25 2.25 0 003.25 18h13.5A2.25 2.25 0 0019 15.75v-5.5A2.25 2.25 0 0016.75 8H3.25z" />
              </svg>
              バーコード
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onCompositionStart={() => { isComposing.current = true; }}
              onCompositionEnd={(e) => {
                isComposing.current = false;
                handleSearchInput((e.target as HTMLInputElement).value);
              }}
              placeholder="タイトル、著者名、出版社で検索..."
              className="w-full p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white placeholder:text-slate-400"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner className="w-4 h-4 text-blue-500" />
              </div>
            )}
          </div>
          {searchError && (
            <p className="text-sm text-amber-600 mt-2">{searchError}</p>
          )}
          {candidates.length > 0 && (
            <div
              ref={candidateRef}
              className="mt-2 border border-blue-200 rounded-lg bg-white shadow-md overflow-hidden"
            >
              <p className="text-xs text-slate-500 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                候補を選択してください（{candidates.length}件）
              </p>
              {candidates.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyCandidate(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-slate-100 last:border-b-0 flex gap-3 items-start"
                >
                  {c.thumbnail ? (
                    <Image
                      src={c.thumbnail}
                      alt=""
                      width={48}
                      height={64}
                      className="rounded shadow-sm flex-shrink-0 object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-[48px] h-[64px] bg-slate-200 rounded flex-shrink-0 flex items-center justify-center">
                      <span className="text-slate-400 text-xs">No Image</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                    <p className="text-xs text-slate-600 truncate">{c.author}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[c.publisherName, c.publishedYear ? `${c.publishedYear}年` : "", c.pages ? `${c.pages}p` : ""].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ステータス選択 */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">
          ステータス
        </label>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_FLOW.map((key) => {
            const { label, color } = BOOK_STATUSES[key];
            const isActive = status === key;
            const colorMap = {
              purple: isActive ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:border-purple-300",
              amber: isActive ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:border-amber-300",
              blue: isActive ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-blue-300",
              green: isActive ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300",
            };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`px-2 py-2 rounded-lg border-2 text-xs font-medium text-center transition-all ${colorMap[color]}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：存在と時間"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">著者</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="例：ハイデガー"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">出版社</label>
          <input
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="例：岩波書店"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">出版年</label>
          <input
            type="number"
            value={publishedYear}
            onChange={(e) => setPublishedYear(e.target.value)}
            placeholder="例：2023"
            min="1800"
            max="2100"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${status === "READ" ? "sm:grid-cols-2" : ""} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ページ数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="450"
            min="1"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {status === "READ" && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              読了日
            </label>
            <input
              type="date"
              value={readAt}
              onChange={(e) => setReadAt(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          学問分野
        </label>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">未分類</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            カテゴリ
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">選択なし</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            評価 (1–5)
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">なし</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {description && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            内容紹介
          </label>
          <details open className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <summary className="text-xs text-slate-400 cursor-pointer select-none">
              表示 / 非表示
            </summary>
            <p className="text-sm text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap">
              {description}
            </p>
          </details>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          メモ・感想
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="読んで気づいたこと、重要な概念など..."
          rows={4}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>保存中...</span>
            </>
          ) : (
            mode === "edit" ? "更新する" : "登録する"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-5 py-2.5 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
