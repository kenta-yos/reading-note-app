"use client";

import { useState } from "react";
import type { NDLBook } from "@/lib/ndl";
import BookListWithFilter from "./BookListWithFilter";

type Props = {
  recentBooks: NDLBook[];
  upcomingBooks: NDLBook[];
  userDisciplines: string[];
};

export default function DiscoverTabs({ recentBooks, upcomingBooks, userDisciplines }: Props) {
  const [tab, setTab] = useState<"recent" | "upcoming">("recent");

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-0 mb-4 border-b border-slate-200">
        <button
          onClick={() => setTab("recent")}
          className={[
            "pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "recent"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600",
          ].join(" ")}
        >
          今月の新刊
          <span
            className={[
              "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              tab === "recent"
                ? "bg-blue-500 text-white"
                : "bg-slate-200 text-slate-500",
            ].join(" ")}
          >
            {recentBooks.length}
          </span>
        </button>
        <button
          onClick={() => setTab("upcoming")}
          className={[
            "pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors -mb-px",
            tab === "upcoming"
              ? "border-violet-500 text-violet-600"
              : "border-transparent text-slate-400 hover:text-slate-600",
          ].join(" ")}
        >
          今後2ヶ月の予定
          <span
            className={[
              "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              tab === "upcoming"
                ? "bg-violet-500 text-white"
                : "bg-slate-200 text-slate-500",
            ].join(" ")}
          >
            {upcomingBooks.length}
          </span>
        </button>
      </div>

      <BookListWithFilter
        books={tab === "recent" ? recentBooks : upcomingBooks}
        userDisciplines={userDisciplines}
      />
    </div>
  );
}
