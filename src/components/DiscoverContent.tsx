"use client";

import { useState } from "react";
import type { NDLBook } from "@/lib/ndl";
import DiscoverSyncButton from "./DiscoverSyncButton";
import DiscoverTabs from "./DiscoverTabs";

type Props = {
  recentBooks: NDLBook[];
  upcomingBooks: NDLBook[];
  bookmarkedBooks: NDLBook[];
  bookmarkedIsbns: string[];
  userDisciplines: string[];
  allPublishers: string[];
  toggleBookmark: (book: NDLBook) => Promise<void>;
};

export default function DiscoverContent(props: Props) {
  const [newIsbns, setNewIsbns] = useState<Set<string>>(new Set());

  return (
    <>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-slate-500 text-sm">最新刊・近刊</p>
        <DiscoverSyncButton
          onSynced={(isbns) => setNewIsbns(new Set(isbns))}
        />
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <DiscoverTabs {...props} newIsbns={newIsbns} />
      </div>
    </>
  );
}
