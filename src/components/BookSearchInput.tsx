"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Spinner from "./Spinner";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), { ssr: false });

export type BookCandidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
  pages: number | null;
  description: string | null;
  thumbnail: string | null;
  isbn: string | null;
};

type BookSearchInputProps = {
  onSelect: (candidate: BookCandidate) => void;
};

export default function BookSearchInput({ onSelect }: BookSearchInputProps) {
  const [titleQuery, setTitleQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [publisherQuery, setPublisherQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [selected, setSelected] = useState<BookCandidate | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  const doSearch = useCallback(async (title: string, author: string, publisher: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearchLoading(true);
    setSearchError("");

    try {
      const params = new URLSearchParams();
      if (title.trim()) params.set("title", title.trim());
      if (author.trim()) params.set("author", author.trim());
      if (publisher.trim()) params.set("publisher", publisher.trim());

      const res = await fetch(`/api/books/search?${params.toString()}`, {
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

  const doIsbnSearch = useCallback(async (isbn: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearchLoading(true);
    setSearchError("");

    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(`isbn:${isbn}`)}`, {
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

  const scheduleSearch = useCallback(
    (title: string, author: string, publisher: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const anyLongEnough = [title, author, publisher].some(
        (v) => v.trim().length >= 2
      );

      if (!anyLongEnough) {
        setCandidates([]);
        setSearchError("");
        setSearchLoading(false);
        abortRef.current?.abort();
        return;
      }

      debounceRef.current = setTimeout(() => {
        doSearch(title, author, publisher);
      }, 350);
    },
    [doSearch]
  );

  const handleTitleChange = (value: string) => {
    setTitleQuery(value);
    scheduleSearch(value, authorQuery, publisherQuery);
  };

  const handleAuthorChange = (value: string) => {
    setAuthorQuery(value);
    scheduleSearch(titleQuery, value, publisherQuery);
  };

  const handlePublisherChange = (value: string) => {
    setPublisherQuery(value);
    scheduleSearch(titleQuery, authorQuery, value);
  };

  const handleSelect = (candidate: BookCandidate) => {
    setSelected(candidate);
    setCandidates([]);
    setSearchError("");
    setTitleQuery("");
    setAuthorQuery("");
    setPublisherQuery("");
    onSelect(candidate);
  };

  const handleClearSelection = () => {
    setSelected(null);
    setTitleQuery("");
    setAuthorQuery("");
    setPublisherQuery("");
  };

  const handleBarcodeScan = useCallback(
    (isbn: string) => {
      setShowScanner(false);
      doIsbnSearch(isbn);
    },
    [doIsbnSearch]
  );

  const handleCloseFilters = () => {
    setAuthorQuery("");
    setPublisherQuery("");
    setShowFilters(false);
    // 書名のみで再検索
    if (titleQuery.trim().length >= 2) {
      scheduleSearch(titleQuery, "", "");
    }
  };

  // 選択済み表示
  if (selected) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-blue-800">
            選択済み
          </label>
          <button
            type="button"
            onClick={handleClearSelection}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            解除
          </button>
        </div>
        <div className="flex gap-3 items-start bg-white rounded-lg p-3 border border-blue-100">
          {selected.thumbnail ? (
            <Image
              src={selected.thumbnail}
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
            <p className="text-sm font-medium text-slate-800 truncate">{selected.title}</p>
            <p className="text-xs text-slate-600 truncate">{selected.author}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {[selected.publisherName, selected.publishedYear ? `${selected.publishedYear}年` : ""].filter(Boolean).join(" / ")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      {/* バーコードスキャナー */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

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

      {/* 書名入力（メイン） */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={titleQuery}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="書名を入力（例：サピエンス全史）"
            className="w-full p-2.5 pr-10 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white placeholder:text-slate-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {searchLoading ? (
              <Spinner className="w-4 h-4 text-blue-500" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* ドロップダウン */}
        {candidates.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 border border-blue-200 rounded-lg bg-white shadow-lg overflow-hidden z-50">
            <p className="text-xs text-slate-500 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
              候補を選択してください（{candidates.length}件）
            </p>
            {candidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-slate-100 last:border-b-0 flex gap-3 items-start"
              >
                {c.thumbnail ? (
                  <Image
                    src={c.thumbnail}
                    alt=""
                    width={40}
                    height={56}
                    className="rounded shadow-sm flex-shrink-0 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-[40px] h-[56px] bg-slate-200 rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-slate-400 text-[10px]">No Image</span>
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

      {/* 絞り込み条件トグル */}
      {!showFilters ? (
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          絞り込み条件を追加
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">著者</label>
            <input
              type="text"
              value={authorQuery}
              onChange={(e) => handleAuthorChange(e.target.value)}
              placeholder="著者名で絞り込み"
              className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">出版社</label>
            <input
              type="text"
              value={publisherQuery}
              onChange={(e) => handlePublisherChange(e.target.value)}
              placeholder="出版社名で絞り込み"
              className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={handleCloseFilters}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            絞り込みを閉じる
          </button>
        </div>
      )}

      {searchError && (
        <p className="text-sm text-amber-600 mt-2">{searchError}</p>
      )}
    </div>
  );
}
