"use client";

import { useState } from "react";
import type { NDLBook } from "@/lib/ndl";

// 出版社名ハッシュ → 色クラス（完全な文字列で列挙して Tailwind の purge を回避）
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
];

function publisherColorClass(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return PUBLISHER_COLORS[hash % PUBLISHER_COLORS.length];
}

type Props = {
  books: NDLBook[];
  userDisciplines?: string[];
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

function BookRow({
  book,
  userDisciplines,
  isBookmarked,
  onToggle,
}: {
  book: NDLBook;
  userDisciplines: string[];
  isBookmarked: boolean;
  onToggle: (() => void) | null;
}) {
  const [pending, setPending] = useState(false);

  const handleClick = () => {
    if (!onToggle || pending) return;
    setPending(true);
    onToggle();
    // pending は楽観的更新で即座に反映されるため短時間で解除
    setTimeout(() => setPending(false), 800);
  };

  const titleEl = book.ndlUrl ? (
    <a
      href={book.ndlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-blue-700 hover:underline leading-snug"
    >
      {book.title}
    </a>
  ) : (
    <p className="text-sm font-medium text-slate-800 leading-snug">{book.title}</p>
  );

  const disciplineMatch = book.discipline && userDisciplines.includes(book.discipline);

  return (
    <div className="py-3 border-b border-slate-100 last:border-0 flex gap-2 items-start">
      <div className="flex-1 min-w-0">
        {titleEl}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 items-center">
          {book.author && (
            <span className="text-xs text-slate-500">{book.author}</span>
          )}
          {book.publisher && (
            <span
              className={`text-[11px] font-medium border px-1.5 py-0.5 rounded ${publisherColorClass(book.publisher)}`}
            >
              {book.publisher}
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono">{book.issued}</span>
          {book.price != null && (
            <span className="text-xs text-slate-600 font-medium">
              ¥{book.price.toLocaleString()}
            </span>
          )}
          {book.discipline && disciplineMatch && (
            <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 rounded">
              ★ {book.discipline}
            </span>
          )}
          {book.discipline && !disciplineMatch && (
            <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
              {book.discipline}
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
  bookmarked = new Set(),
  onToggleBookmark,
}: Props) {
  const [selectedDisc, setSelectedDisc] = useState<string | null>(null);

  // 分野タグを件数付きで収集
  const discCounts = new Map<string, number>();
  for (const b of books) {
    if (b.discipline) {
      discCounts.set(b.discipline, (discCounts.get(b.discipline) ?? 0) + 1);
    }
  }
  const disciplines = [...discCounts.entries()].sort((a, b) => b[1] - a[1]);

  const filtered = selectedDisc
    ? books.filter((b) => b.discipline === selectedDisc)
    : books;

  return (
    <div>
      {/* フィルターバー */}
      {disciplines.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setSelectedDisc(null)}
            className={[
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              selectedDisc === null
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            ].join(" ")}
          >
            すべて ({books.length})
          </button>
          {disciplines.map(([disc, count]) => {
            const isInterest = userDisciplines.includes(disc);
            const isSelected = selectedDisc === disc;
            return (
              <button
                key={disc}
                onClick={() => setSelectedDisc(disc === selectedDisc ? null : disc)}
                className={[
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  isSelected
                    ? isInterest
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                    : isInterest
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                ].join(" ")}
              >
                {isInterest ? "★ " : ""}
                {disc} ({count})
              </button>
            );
          })}
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
            return (
              <BookRow
                key={`${b.isbn ?? b.title}-${i}`}
                book={b}
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
