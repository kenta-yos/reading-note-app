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
      <section className="mb-16">
        <ConceptNetwork data={graphData} />
      </section>

      {/* Book List */}
      <section className="mb-16" id="book-list">
        <BookList books={bookList} />
      </section>
    </>
  );
}
