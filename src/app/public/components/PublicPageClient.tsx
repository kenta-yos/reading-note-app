"use client";

import type { ConceptGraphData } from "@/lib/concepts";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type Evolution = {
  period: string;
  theme: string;
  description: string;
  keyBooks: string[];
};

type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  discipline: string | null;
  readYear: number;
  pageCount: number | null;
};

type Props = {
  evolution: Evolution[];
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  evolution,
  graphData,
  bookList,
}: Props) {
  return (
    <>
      {/* Reading Evolution */}
      {evolution.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-800 mb-4">読書遍歴</h2>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-blue-200" />
            {evolution.map((e, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      {e.period}
                    </span>
                    <span className="text-sm font-semibold text-blue-900">
                      {e.theme}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-2">
                    {e.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.keyBooks.map((book) => (
                      <span
                        key={book}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {book}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Concept Network */}
      <section className="mb-12">
        <ConceptNetwork data={graphData} />
      </section>

      {/* Book List */}
      <section id="book-list">
        <BookList books={bookList} />
      </section>
    </>
  );
}
