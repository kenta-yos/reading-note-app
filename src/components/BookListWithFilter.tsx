"use client";

import { useState, useRef, useEffect } from "react";
import type { NDLBook } from "@/lib/ndl";

// 出版社ごとに異なる色を割り当てるための30色パレット（Tailwind クラスを完全文字列で列挙）
const PUBLISHER_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  "bg-lime-50 text-lime-700 border-lime-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-green-50 text-green-700 border-green-200",
  "bg-yellow-50 text-yellow-700 border-yellow-200",
  "bg-red-50 text-red-700 border-red-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-violet-100 text-violet-800 border-violet-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-teal-100 text-teal-800 border-teal-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-sky-100 text-sky-800 border-sky-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  "bg-lime-100 text-lime-800 border-lime-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
  "bg-pink-100 text-pink-800 border-pink-300",
];

type Props = {
  books: NDLBook[];
  userDisciplines?: string[];
  allPublishers?: string[]; // 全出版社リスト（色の一意割り当て用）
  bookmarked?: Set<string>;
  onToggleBookmark?: (book: NDLBook) => void;
};

function BookmarkButton({
  isBookmarked,
  disabled,
  onClick,
}: {
  isBookmarked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isBookmarked ? "ブックマーク解除" : "ブックマーク"}
      className={[
        "ml-auto flex-shrink-0 p-1 rounded transition-colors",
        isBookmarked
          ? "text-amber-500 hover:text-amber-400"
          : "text-slate-300 hover:text-amber-400",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
    </button>
  );
}

/** issued を "2026年2月25日" / "2026年2月" / "2026年" の形式に変換 */
function formatIssuedDate(issued: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(issued)) {
    const y = parseInt(issued.slice(0, 4));
    const m = parseInt(issued.slice(5, 7));
    const d = parseInt(issued.slice(8, 10));
    return d === 0 ? `${y}年${m}月` : `${y}年${m}月${d}日`;
  }
  if (/^\d{4}-\d{2}$/.test(issued)) {
    return `${parseInt(issued.slice(0, 4))}年${parseInt(issued.slice(5, 7))}月`;
  }
  return `${issued.slice(0, 4)}年`;
}

/** 書籍へのリンクURL（版元ドットコム > NDL の優先順位） */
function bookLinkUrl(book: NDLBook): string | null {
  if (book.isbn) return `https://www.hanmoto.com/bd/isbn/${book.isbn.replace(/-/g, "")}`;
  return book.ndlUrl;
}

function BookRow({
  book,
  publisherColor,
  userDisciplines,
  isBookmarked,
  onToggle,
}: {
  book: NDLBook;
  publisherColor: string;
  userDisciplines: string[];
  isBookmarked: boolean;
  onToggle: (() => void) | null;
}) {
  const [pending, setPending] = useState(false);

  const handleClick = () => {
    if (!onToggle || pending) return;
    setPending(true);
    onToggle();
    setTimeout(() => setPending(false), 800);
  };

  const url = bookLinkUrl(book);
  const disciplineMatch = book.discipline && userDisciplines.includes(book.discipline);

  return (
    <div className="py-3 border-b border-slate-100 last:border-0 flex gap-2 items-start">
      <div className="flex-1 min-w-0">
        {/* 書名 + 出版社タグ + カテゴリタグ（インライン） */}
        <p className="text-sm leading-snug mb-0.5">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 hover:underline"
            >
              {book.title}
            </a>
          ) : (
            <span className="font-medium text-slate-800">{book.title}</span>
          )}
          {book.publisher && (
            <span
              className={`inline-block align-middle ml-1.5 text-[10px] font-medium border px-1.5 py-0.5 rounded ${publisherColor}`}
            >
              {book.publisher}
            </span>
          )}
          {book.discipline && (
            <span
              className={[
                "inline-block align-middle ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                disciplineMatch
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              {disciplineMatch ? `★ ${book.discipline}` : book.discipline}
            </span>
          )}
        </p>
        {/* 著者・日付・価格 */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
          {book.author && (
            <span className="text-xs text-slate-500">{book.author}</span>
          )}
          <span className="text-xs text-slate-400">{formatIssuedDate(book.issued)}</span>
          {book.price != null && (
            <span className="text-xs text-slate-600 font-medium">
              ¥{book.price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      {onToggle && book.isbn && (
        <BookmarkButton
          isBookmarked={isBookmarked}
          disabled={pending}
          onClick={handleClick}
        />
      )}
    </div>
  );
}

export default function BookListWithFilter({
  books,
  userDisciplines = [],
  allPublishers = [],
  bookmarked = new Set(),
  onToggleBookmark,
}: Props) {
  const [selectedPublisher, setSelectedPublisher] = useState<string | null>(null);
  const [publisherSearch, setPublisherSearch] = useState("");
  const [isPublisherOpen, setIsPublisherOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsPublisherOpen(false);
        setPublisherSearch("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 全出版社にインデックス順で色を割り当て（重複なし）
  const publisherColorMap = new Map<string, string>(
    allPublishers.map((name, i) => [name, PUBLISHER_COLORS[i % PUBLISHER_COLORS.length]])
  );

  // 現タブに存在する出版社のみ（フィルター選択肢用）
  const publishersInBooks = [...new Set(books.map((b) => b.publisher).filter(Boolean))].sort() as string[];

  const filtered = selectedPublisher
    ? books.filter((b) => b.publisher === selectedPublisher)
    : books;

  // 検索でフィルタリングした出版社リスト
  const filteredPublishers = publisherSearch
    ? publishersInBooks.filter((p) => p.includes(publisherSearch))
    : publishersInBooks;

  // 各出版社の件数（books 内）
  const publisherBookCounts = new Map<string, number>();
  for (const b of books) {
    if (b.publisher) {
      publisherBookCounts.set(b.publisher, (publisherBookCounts.get(b.publisher) ?? 0) + 1);
    }
  }

  return (
    <div>
      {/* 出版社コンボボックス */}
      {publishersInBooks.length >= 2 && (
        <div className="mb-2" ref={comboboxRef}>
          <div className="relative inline-block">
            <button
              onClick={() => {
                setIsPublisherOpen((prev) => !prev);
                if (isPublisherOpen) setPublisherSearch("");
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <span>
                出版社: {selectedPublisher ?? "すべて"}
              </span>
              {selectedPublisher ? (
                <span
                  role="button"
                  aria-label="出版社フィルターをクリア"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPublisher(null);
                  }}
                  className="ml-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </span>
              ) : (
                <span className="text-slate-400">▼</span>
              )}
            </button>

            {isPublisherOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                <div className="p-1.5 border-b border-slate-100">
                  <input
                    type="text"
                    placeholder="出版社を検索..."
                    value={publisherSearch}
                    onChange={(e) => setPublisherSearch(e.target.value)}
                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {!publisherSearch && (
                    <button
                      onClick={() => {
                        setSelectedPublisher(null);
                        setIsPublisherOpen(false);
                        setPublisherSearch("");
                      }}
                      className={[
                        "w-full text-left px-3 py-1.5 text-xs transition-colors",
                        selectedPublisher === null
                          ? "bg-slate-700 text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      すべての出版社 ({books.length})
                    </button>
                  )}
                  {filteredPublishers.map((pub) => (
                    <button
                      key={pub}
                      onClick={() => {
                        setSelectedPublisher(pub);
                        setIsPublisherOpen(false);
                        setPublisherSearch("");
                      }}
                      className={[
                        "w-full text-left px-3 py-1.5 text-xs transition-colors",
                        selectedPublisher === pub
                          ? "bg-slate-700 text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {pub} ({publisherBookCounts.get(pub) ?? 0})
                    </button>
                  ))}
                  {filteredPublishers.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">見つかりません</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 書籍リスト */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          該当する書籍が見つかりませんでした
        </p>
      ) : (
        <div>
          {filtered.map((b, i) => {
            const cleanIsbn = b.isbn?.replace(/-/g, "") ?? null;
            const publisherColor = b.publisher
              ? (publisherColorMap.get(b.publisher) ?? PUBLISHER_COLORS[0])
              : PUBLISHER_COLORS[0];
            return (
              <BookRow
                key={`${b.isbn ?? b.title}-${i}`}
                book={b}
                publisherColor={publisherColor}
                userDisciplines={userDisciplines}
                isBookmarked={cleanIsbn ? bookmarked.has(cleanIsbn) : false}
                onToggle={onToggleBookmark ? () => onToggleBookmark(b) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
