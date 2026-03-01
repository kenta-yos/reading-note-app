"use client";

import type { ConceptGraphData } from "@/lib/concepts";
import DisciplineChart from "./CategoryChart";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type DisciplineData = { discipline: string; count: number };
type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  discipline: string | null;
  readYear: number;
  pageCount: number;
};

type Props = {
  disciplineData: DisciplineData[];
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  disciplineData,
  graphData,
  bookList,
}: Props) {
  return (
    <>
      {/* Discipline Chart */}
      <section className="mb-12">
        <DisciplineChart data={disciplineData} />
      </section>

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
