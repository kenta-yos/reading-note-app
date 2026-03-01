"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NDLBook } from "@/lib/ndl";
import BookListWithFilter from "./BookListWithFilter";

type Tab = "recent" | "upcoming" | "bookmark";

type Props = {
  recentBooks: NDLBook[];
  upcomingBooks: NDLBook[];
  bookmarkedBooks: NDLBook[];
  bookmarkedIsbns: string[];
  userDisciplines: string[];
  allPublishers: string[];
  toggleBookmark: (book: NDLBook) => Promise<void>;
  newIsbns?: Set<string>;
};

export default function DiscoverTabs({
  recentBooks,
  upcomingBooks,
  bookmarkedBooks,
  bookmarkedIsbns,
  userDisciplines,
  allPublishers,
  toggleBookmark,
  newIsbns = new Set(),
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("recent");
  const [, startTransition] = useTransition();

  const [optimisticBookmarked, applyToggle] = useOptimistic(
    new Set(bookmarkedIsbns),
    (current: Set<string>, isbn: string) => {
      const next = new Set(current);
      if (next.has(isbn)) next.delete(isbn);
      else next.add(isbn);
      return next;
    }
  );

  const handleToggle = (book: NDLBook) => {
    if (!book.isbn) return;
    const cleanIsbn = book.isbn.replace(/-/g, "");
    startTransition(async () => {
      applyToggle(cleanIsbn);
      await toggleBookmark(book);
      router.refresh();
    });
  };

  const tabs: {
    key: Tab;
    label: string;
    count: number;
    activeClass: string;
    badgeActive: string;
  }[] = [
    {
      key: "recent",
      label: "出版1ヶ月以内",
      count: recentBooks.length,
      activeClass: "border-blue-500 text-blue-600",
      badgeActive: "bg-blue-500 text-white",
    },
    {
      key: "upcoming",
      label: "今後1ヶ月の予定",
      count: upcomingBooks.length,
      activeClass: "border-violet-500 text-violet-600",
      badgeActive: "bg-violet-500 text-white",
    },
    {
      key: "bookmark",
      label: "ブックマーク",
      count: optimisticBookmarked.size,
      activeClass: "border-amber-500 text-amber-600",
      badgeActive: "bg-amber-500 text-white",
    },
  ];

  const currentBooks =
    tab === "recent"
      ? recentBooks
      : tab === "upcoming"
      ? upcomingBooks
      : bookmarkedBooks;

  return (
    <div>
      <div className="flex gap-0 mb-4 border-b border-slate-200">
        {tabs.map(({ key, label, count, activeClass, badgeActive }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === key
                ? activeClass
                : "border-transparent text-slate-400 hover:text-slate-600",
            ].join(" ")}
          >
            {label}
            <span
              className={[
                "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === key ? badgeActive : "bg-slate-200 text-slate-500",
              ].join(" ")}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <BookListWithFilter
        books={currentBooks}
        userDisciplines={userDisciplines}
        allPublishers={allPublishers}
        bookmarked={optimisticBookmarked}
        onToggleBookmark={handleToggle}
        newIsbns={newIsbns}
      />
    </div>
  );
}
