"use client";

import type { ConceptGraphData } from "@/lib/concepts";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  discipline: string | null;
  readYear: number;
  pageCount: number | null;
};

type Props = {
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  graphData,
  bookList,
}: Props) {
  return (
    <>
      {/* Concept Network */}
      <div className="mb-20">
        <ConceptNetwork data={graphData} />
      </div>

      {/* Book List */}
      <div id="booklist">
        <BookList books={bookList} />
      </div>
    </>
  );
}
