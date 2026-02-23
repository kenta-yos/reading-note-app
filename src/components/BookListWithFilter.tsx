"use client";

import { useState } from "react";
import type { NDLBook } from "@/lib/ndl";

type Props = {
  books: NDLBook[];
  userDisciplines?: string[];
};

function BookRow({ book, userDisciplines = [] }: { book: NDLBook; userDisciplines: string[] }) {
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

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      {titleEl}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {book.author && (
          <span className="text-xs text-slate-500">{book.author}</span>
        )}
        <span className="text-xs text-slate-400">{book.publisher}</span>
        <span className="text-xs text-slate-400 font-mono">{book.issued}</span>
        {book.discipline && userDisciplines.includes(book.discipline) && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 rounded">
            ★ {book.discipline}
          </span>
        )}
        {book.discipline && !userDisciplines.includes(book.discipline) && (
          <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
            {book.discipline}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BookListWithFilter({ books, userDisciplines = [] }: Props) {
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
                {isInterest ? "★ " : ""}{disc} ({count})
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
          {filtered.map((b, i) => (
            <BookRow key={`${b.isbn ?? b.title}-${i}`} book={b} userDisciplines={userDisciplines} />
          ))}
        </div>
      )}
    </div>
  );
}
